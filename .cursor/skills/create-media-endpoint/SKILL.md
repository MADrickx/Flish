---
name: create-media-endpoint
description: Add a streaming or media-serving endpoint to the Flish .NET backend — video range-request streaming, audio streaming, thumbnail/photo serving. Use when the user asks to add a stream endpoint, serve media, or handle range requests for video or audio playback.
---

# Create Media Endpoint (Flish Backend)

Adds a media streaming or serving endpoint to `back-end/flish/flish/Program.cs`.

## Workflow

1. **Determine the media type**: video, audio, or image/photo.
2. **Choose the endpoint pattern**: range-request streaming (video/audio) or direct serve (images).
3. **Add the endpoint** in `back-end/flish/flish/Program.cs` within the `api` route group.
4. **Verify** the `FilePathResolver` resolves the path safely within the master directory.

## Key Dependencies

- `FlishDbContext` -- look up `FileIndexEntry` by id
- `FilePathResolver` -- convert `RelativePath` to safe absolute path (prevents traversal)
- `IOptions<StorageOptions>` -- master directory and limits

## Template: Video/Audio Range-Request Streaming

Supports `Range` header for seeking in HTML5 `<video>` and `<audio>`:

```csharp
api.MapGet("/files/{id:guid}/stream", async (
        Guid id,
        FlishDbContext dbContext,
        FilePathResolver pathResolver,
        HttpContext httpContext,
        CancellationToken cancellationToken) =>
    {
        var entry = await dbContext.FileIndexEntries
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (entry is null)
            return Results.NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!File.Exists(absolutePath))
            return Results.NotFound();

        var fileInfo = new FileInfo(absolutePath);
        var contentType = entry.MimeType;
        var totalLength = fileInfo.Length;

        var rangeHeader = httpContext.Request.Headers.Range.ToString();
        if (!string.IsNullOrWhiteSpace(rangeHeader) && rangeHeader.StartsWith("bytes="))
        {
            var rangeParts = rangeHeader["bytes=".Length..].Split('-');
            var start = long.Parse(rangeParts[0]);
            var end = rangeParts.Length > 1 && long.TryParse(rangeParts[1], out var e) ? e : totalLength - 1;
            end = Math.Min(end, totalLength - 1);
            var chunkLength = end - start + 1;

            var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, true);
            stream.Seek(start, SeekOrigin.Begin);

            httpContext.Response.StatusCode = 206;
            httpContext.Response.Headers.ContentRange = $"bytes {start}-{end}/{totalLength}";
            httpContext.Response.Headers.AcceptRanges = "bytes";
            httpContext.Response.ContentType = contentType;
            httpContext.Response.ContentLength = chunkLength;

            await StreamCopyAsync(stream, httpContext.Response.Body, chunkLength, cancellationToken);
            return Results.Empty;
        }

        var fullStream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, true);
        return Results.File(fullStream, contentType, enableRangeProcessing: true);
    });
```

Helper for chunked copy:

```csharp
static async Task StreamCopyAsync(Stream source, Stream destination, long bytes, CancellationToken ct)
{
    var buffer = new byte[64 * 1024];
    var remaining = bytes;
    while (remaining > 0)
    {
        var toRead = (int)Math.Min(buffer.Length, remaining);
        var read = await source.ReadAsync(buffer.AsMemory(0, toRead), ct);
        if (read == 0) break;
        await destination.WriteAsync(buffer.AsMemory(0, read), ct);
        remaining -= read;
    }
    await source.DisposeAsync();
}
```

## Template: Image/Thumbnail Serving

For photos and thumbnails, direct file serving with caching:

```csharp
api.MapGet("/files/{id:guid}/view", async (
        Guid id,
        FlishDbContext dbContext,
        FilePathResolver pathResolver,
        CancellationToken cancellationToken) =>
    {
        var entry = await dbContext.FileIndexEntries
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (entry is null)
            return Results.NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!File.Exists(absolutePath))
            return Results.NotFound();

        var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, true);
        return Results.File(stream, entry.MimeType);
    });
```

## MIME Type Reference

Common types the indexer should recognize:

| Extension | MIME Type |
|-----------|-----------|
| mp4 | video/mp4 |
| mkv | video/x-matroska |
| webm | video/webm |
| avi | video/x-msvideo |
| mov | video/quicktime |
| mp3 | audio/mpeg |
| flac | audio/flac |
| wav | audio/wav |
| ogg | audio/ogg |
| aac | audio/aac |
| jpg, jpeg | image/jpeg |
| png | image/png |
| gif | image/gif |
| webp | image/webp |
| bmp | image/bmp |

## Rules

- **Always** use `FilePathResolver.ToAbsolutePath()` to prevent path traversal
- **Always** check `!x.IsDeleted` and `File.Exists()` before serving
- **Always** set correct `Content-Type` based on the file's MIME type
- **Always** support `Range` headers for video/audio (required for seeking)
- **Always** use async file IO with large buffers (`64 * 1024`)
- **Always** place streaming endpoints inside the `api` group (requires auth)
- **Use** `Results.File(..., enableRangeProcessing: true)` when ASP.NET built-in range support suffices
- **Use** manual range parsing only when you need custom chunking behavior
