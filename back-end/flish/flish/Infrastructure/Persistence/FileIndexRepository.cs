using flish.Contracts.Files;
using flish.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace flish.Infrastructure.Persistence;

public class FileIndexRepository(FlishDbContext dbContext) : Repository<FileIndexEntry>(dbContext)
{
    public async Task<(List<FileItemDto> Items, int Total)> GetPagedFilteredAsync(
        int page, int pageSize, string? query, string? extension, string? category,
        long? minSize, long? maxSize, DateTime? modifiedAfter, DateTime? modifiedBefore,
        CancellationToken ct)
    {
        var q = DbSet.AsNoTracking().Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query))
            q = q.Where(x => x.FileName.Contains(query) || x.RelativePath.Contains(query));

        if (!string.IsNullOrWhiteSpace(extension))
        {
            var extensions = extension
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(e => e.TrimStart('.').ToLowerInvariant())
                .ToList();
            q = q.Where(x => extensions.Contains(x.Extension));
        }

        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(x => x.Category == category);

        if (minSize.HasValue)
            q = q.Where(x => x.SizeBytes >= minSize.Value);

        if (maxSize.HasValue)
            q = q.Where(x => x.SizeBytes <= maxSize.Value);

        if (modifiedAfter.HasValue)
            q = q.Where(x => x.LastWriteUtc >= modifiedAfter.Value);

        if (modifiedBefore.HasValue)
            q = q.Where(x => x.LastWriteUtc <= modifiedBefore.Value);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderBy(x => x.RelativePath)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => ToDto(x))
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<FileItemDto?> GetDtoByIdAsync(Guid id, CancellationToken ct)
    {
        return await DbSet
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.Id == id)
            .Select(x => ToDto(x))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<FileIndexEntry?> GetActiveByIdAsync(Guid id, CancellationToken ct)
    {
        return await DbSet.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, ct);
    }

    public async Task<FileIndexEntry?> GetByShortCodeAsync(string code, CancellationToken ct)
    {
        return await DbSet.AsNoTracking().FirstOrDefaultAsync(x => x.ShortCode == code && !x.IsDeleted, ct);
    }

    private static FileItemDto ToDto(FileIndexEntry x) =>
        new(x.Id, x.RelativePath, x.FileName, x.Extension,
            x.SizeBytes, x.MimeType, x.Category, x.ShortCode,
            x.LastWriteUtc, x.IndexedAtUtc);
}
