using flish.Configuration;
using flish.Contracts.Files;
using flish.Features.Indexing;
using flish.Features.Transcoding;
using flish.Infrastructure.Persistence;
using flish.Infrastructure.Storage;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace flish.Controllers;

[ApiController]
[Route("api/files")]
public class FilesController(
    FileIndexRepository repo,
    FilePathResolver pathResolver,
    IFileIndexer indexer,
    TranscodeService transcodeService,
    IOptions<StorageOptions> storageOptions
) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetFiles(
        int page, int pageSize,
        string? query, string? extension, string? category,
        long? minSize, long? maxSize,
        DateTime? modifiedAfter, DateTime? modifiedBefore,
        CancellationToken ct)
    {
        page = Math.Max(1, page == 0 ? 1 : page);
        pageSize = Math.Clamp(pageSize == 0 ? 50 : pageSize, 1, 200);

        var (items, total) = await repo.GetPagedFilteredAsync(
            page, pageSize, query, extension, category,
            minSize, maxSize, modifiedAfter, modifiedBefore, ct);
        return Ok(new PagedFilesResponse(items, page, pageSize, total));
    }

    [HttpGet("grouped")]
    public async Task<IActionResult> GetFilesGrouped(
        int page, int pageSize, string? category, string? query, CancellationToken ct)
    {
        page = Math.Max(1, page == 0 ? 1 : page);
        pageSize = Math.Clamp(pageSize == 0 ? 24 : pageSize, 1, 100);

        var (items, total) = await repo.GetPagedGroupedAsync(page, pageSize, category, query, ct);
        return Ok(new PagedGroupedResponse(items, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetFile(Guid id, CancellationToken ct)
    {
        var item = await repo.GetDtoByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var entry = await repo.GetActiveByIdAsync(id, ct);
        if (entry is null) return NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!System.IO.File.Exists(absolutePath)) return NotFound();

        var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true);
        return File(stream, entry.MimeType, entry.FileName, enableRangeProcessing: true);
    }

    [HttpGet("{id:guid}/stream")]
    public async Task<IResult> Stream(Guid id, CancellationToken ct)
    {
        var entry = await repo.GetActiveByIdAsync(id, ct);
        if (entry is null) return Results.NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!System.IO.File.Exists(absolutePath)) return Results.NotFound();

        return await StreamHelper.StreamFileAsync(absolutePath, entry.MimeType, HttpContext, ct);
    }

    [HttpPost("upload")]
    [EnableRateLimiting("writes")]
    public async Task<IActionResult> Upload(IFormFile file, string? relativeDirectory, CancellationToken ct)
    {
        if (file.Length <= 0)
            return BadRequest("Uploaded file is empty.");

        if (file.Length > storageOptions.Value.MaxUploadBytes)
            return BadRequest("Uploaded file exceeds max upload size.");

        var safeFileName = Path.GetFileName(file.FileName);
        var uploadedExtension = Path.GetExtension(safeFileName).TrimStart('.').ToLowerInvariant();

        var allowedExtensions = storageOptions.Value.AllowedExtensions;
        if (allowedExtensions.Length > 0)
        {
            var isAllowed = allowedExtensions
                .Select(x => x.Trim().TrimStart('.').ToLowerInvariant())
                .Contains(uploadedExtension, StringComparer.OrdinalIgnoreCase);
            if (!isAllowed)
                return BadRequest("Uploaded file extension is not allowed.");
        }

        await using var contentStream = file.OpenReadStream();
        if (!await FileSignatureValidator.MatchesExtensionAsync(contentStream, uploadedExtension, ct))
            return BadRequest("File content does not match the claimed file extension.");

        var safeDirectory = string.IsNullOrWhiteSpace(relativeDirectory) ? string.Empty : relativeDirectory.Trim();
        var combinedRelative = Path.Combine(safeDirectory, safeFileName).Replace('\\', '/');
        var absolutePath = pathResolver.ToAbsolutePath(combinedRelative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        await using (var fs = new FileStream(absolutePath, FileMode.Create, FileAccess.Write, FileShare.None, 64 * 1024, true))
        {
            await file.CopyToAsync(fs, ct);
        }

        await indexer.RunOnceAsync(ct);

        var indexed = await repo.GetByRelativePathAsync(combinedRelative, ct);
        if (indexed is not null && indexed.Category == "video"
            && !string.Equals(indexed.Extension, "mp4", StringComparison.OrdinalIgnoreCase))
        {
            var jobId = transcodeService.StartTranscode(indexed);
            return Created($"/api/files/upload", new { path = combinedRelative, transcodeJobId = jobId });
        }

        return Created($"/api/files/upload", new { path = combinedRelative });
    }

    [HttpDelete("{id:guid}")]
    [EnableRateLimiting("writes")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var entry = await repo.GetActiveByIdAsync(id, ct);
        if (entry is null) return NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (System.IO.File.Exists(absolutePath))
            System.IO.File.Delete(absolutePath);

        entry.IsDeleted = true;
        entry.IndexedAtUtc = DateTime.UtcNow;
        await repo.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/rename")]
    [EnableRateLimiting("writes")]
    public async Task<IActionResult> Rename(Guid id, RenameFileRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.NewFileName))
            return BadRequest(new { error = "New filename is required." });

        var newName = request.NewFileName.Trim();
        if (newName.Contains('/') || newName.Contains('\\') || newName.Contains(".."))
            return BadRequest(new { error = "Invalid filename." });

        var entry = await repo.GetActiveByIdAsync(id, ct);
        if (entry is null) return NotFound();

        var oldAbsolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!System.IO.File.Exists(oldAbsolutePath)) return NotFound();

        var directory = Path.GetDirectoryName(oldAbsolutePath)!;
        var newAbsolutePath = Path.Combine(directory, newName);

        pathResolver.ToRelativePath(newAbsolutePath);

        if (System.IO.File.Exists(newAbsolutePath))
            return BadRequest(new { error = "A file with that name already exists." });

        System.IO.File.Move(oldAbsolutePath, newAbsolutePath);

        var newRelativePath = pathResolver.ToRelativePath(newAbsolutePath);
        var newExtension = Path.GetExtension(newName).TrimStart('.').ToLowerInvariant();

        entry.FileName = newName;
        entry.RelativePath = newRelativePath;
        entry.Extension = newExtension;
        entry.MimeType = MimeTypeMap.GetMimeType(newExtension);
        entry.Category = MimeTypeMap.GetCategory(newExtension);
        entry.IndexedAtUtc = DateTime.UtcNow;

        await repo.SaveChangesAsync(ct);

        return Ok(new FileItemDto(
            entry.Id, entry.RelativePath, entry.FileName, entry.Extension,
            entry.SizeBytes, entry.MimeType, entry.Category, entry.ShortCode,
            entry.IsPublic, entry.LastWriteUtc, entry.IndexedAtUtc
        ));
    }

    [HttpPatch("{id:guid}/visibility")]
    [EnableRateLimiting("writes")]
    public async Task<IActionResult> SetVisibility(Guid id, VisibilityRequest request, CancellationToken ct)
    {
        var entry = await repo.GetActiveByIdAsync(id, ct);
        if (entry is null) return NotFound();

        entry.IsPublic = request.IsPublic;
        await repo.SaveChangesAsync(ct);

        return Ok(new { id = entry.Id, isPublic = entry.IsPublic });
    }
}
