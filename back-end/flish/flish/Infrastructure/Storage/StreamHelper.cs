namespace flish.Infrastructure.Storage;

public static class StreamHelper
{
    private const int BufferSize = 64 * 1024;

    public static async Task<IResult> StreamFileAsync(
        string absolutePath, string mimeType, HttpContext httpContext, CancellationToken ct)
    {
        var fileLength = new FileInfo(absolutePath).Length;
        var rangeHeader = httpContext.Request.Headers.Range.ToString();

        if (!string.IsNullOrWhiteSpace(rangeHeader) && rangeHeader.StartsWith("bytes="))
        {
            var rangeSpec = rangeHeader["bytes=".Length..].Trim();
            var rangeParts = rangeSpec.Split('-', 2);

            long start;
            long end;

            if (string.IsNullOrEmpty(rangeParts[0]) && rangeParts.Length > 1 && long.TryParse(rangeParts[1], out var suffix) && suffix > 0)
            {
                start = Math.Max(0, fileLength - suffix);
                end = fileLength - 1;
            }
            else if (long.TryParse(rangeParts[0], out start) && start >= 0 && start < fileLength)
            {
                end = rangeParts.Length > 1 && long.TryParse(rangeParts[1], out var e) && e > 0
                    ? Math.Min(e, fileLength - 1)
                    : fileLength - 1;
            }
            else
            {
                httpContext.Response.StatusCode = StatusCodes.Status416RangeNotSatisfiable;
                httpContext.Response.Headers.ContentRange = $"bytes */{fileLength}";
                return Results.Empty;
            }

            var chunkLength = end - start + 1;

            httpContext.Response.StatusCode = StatusCodes.Status206PartialContent;
            httpContext.Response.Headers.ContentRange = $"bytes {start}-{end}/{fileLength}";
            httpContext.Response.Headers.AcceptRanges = "bytes";
            httpContext.Response.ContentType = mimeType;
            httpContext.Response.ContentLength = chunkLength;

            await using var fs = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, BufferSize, true);
            fs.Seek(start, SeekOrigin.Begin);

            var buffer = new byte[BufferSize];
            var remaining = chunkLength;
            while (remaining > 0)
            {
                var toRead = (int)Math.Min(buffer.Length, remaining);
                var read = await fs.ReadAsync(buffer.AsMemory(0, toRead), ct);
                if (read == 0) break;
                await httpContext.Response.Body.WriteAsync(buffer.AsMemory(0, read), ct);
                remaining -= read;
            }

            return Results.Empty;
        }

        httpContext.Response.Headers.AcceptRanges = "bytes";
        var fullStream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, BufferSize, true);
        return Results.File(fullStream, mimeType, enableRangeProcessing: true);
    }
}
