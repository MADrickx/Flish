using flish.Infrastructure.Persistence;
using flish.Infrastructure.Persistence.Entities;
using flish.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace flish.Features.Indexing;

public sealed class FileIndexer(
    FlishDbContext dbContext,
    FilePathResolver pathResolver,
    ILogger<FileIndexer> logger
) : IFileIndexer
{
    private readonly FlishDbContext _dbContext = dbContext;
    private readonly FilePathResolver _pathResolver = pathResolver;
    private readonly ILogger<FileIndexer> _logger = logger;
    private readonly SemaphoreSlim _runLock = new(1, 1);
    private readonly IndexerStatus _status = new();

    public async Task RunOnceAsync(CancellationToken cancellationToken)
    {
        if (!await _runLock.WaitAsync(0, cancellationToken))
        {
            return;
        }

        try
        {
            _status.IsRunning = true;
            _status.LastError = null;

            Directory.CreateDirectory(_pathResolver.MasterDirectory);
            var files = Directory.EnumerateFiles(_pathResolver.MasterDirectory, "*", SearchOption.AllDirectories).ToList();
            _status.LastSeenFiles = files.Count;

            var now = DateTime.UtcNow;
            var existing = await _dbContext.FileIndexEntries
                .AsTracking()
                .ToDictionaryAsync(x => x.RelativePath, cancellationToken);

            var upserted = 0;
            foreach (var absolutePath in files)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var relativePath = _pathResolver.ToRelativePath(absolutePath);
                var fileInfo = new FileInfo(absolutePath);
                var extension = fileInfo.Extension.TrimStart('.').ToLowerInvariant();
                var mimeType = extension switch
                {
                    "txt" => "text/plain",
                    "json" => "application/json",
                    "pdf" => "application/pdf",
                    "png" => "image/png",
                    "jpg" or "jpeg" => "image/jpeg",
                    _ => "application/octet-stream"
                };

                if (existing.TryGetValue(relativePath, out var entity))
                {
                    entity.FileName = fileInfo.Name;
                    entity.Extension = extension;
                    entity.SizeBytes = fileInfo.Length;
                    entity.MimeType = mimeType;
                    entity.LastWriteUtc = fileInfo.LastWriteTimeUtc;
                    entity.CreatedUtc = fileInfo.CreationTimeUtc;
                    entity.IsDeleted = false;
                    entity.IndexedAtUtc = now;
                }
                else
                {
                    _dbContext.FileIndexEntries.Add(new FileIndexEntry
                    {
                        Id = Guid.NewGuid(),
                        RelativePath = relativePath,
                        FileName = fileInfo.Name,
                        Extension = extension,
                        SizeBytes = fileInfo.Length,
                        MimeType = mimeType,
                        LastWriteUtc = fileInfo.LastWriteTimeUtc,
                        CreatedUtc = fileInfo.CreationTimeUtc,
                        IsDeleted = false,
                        IndexedAtUtc = now
                    });
                }

                upserted++;
            }

            var currentPaths = files
                .Select(_pathResolver.ToRelativePath)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var softDeleted = 0;
            foreach (var entity in existing.Values.Where(x => !x.IsDeleted && !currentPaths.Contains(x.RelativePath)))
            {
                entity.IsDeleted = true;
                entity.IndexedAtUtc = now;
                softDeleted++;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            _status.LastCompletedAtUtc = now;
            _status.LastUpsertedFiles = upserted;
            _status.LastSoftDeletedFiles = softDeleted;
            _logger.LogInformation(
                "File scan finished. Seen={Seen}, Upserted={Upserted}, SoftDeleted={SoftDeleted}",
                files.Count,
                upserted,
                softDeleted
            );
        }
        catch (Exception ex)
        {
            _status.LastError = ex.Message;
            _logger.LogError(ex, "File scan failed.");
            throw;
        }
        finally
        {
            _status.IsRunning = false;
            _runLock.Release();
        }
    }

    public IndexerStatus GetStatus() =>
        new()
        {
            IsRunning = _status.IsRunning,
            LastCompletedAtUtc = _status.LastCompletedAtUtc,
            LastSeenFiles = _status.LastSeenFiles,
            LastUpsertedFiles = _status.LastUpsertedFiles,
            LastSoftDeletedFiles = _status.LastSoftDeletedFiles,
            LastError = _status.LastError
        };
}

