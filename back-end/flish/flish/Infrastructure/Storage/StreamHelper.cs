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
            var rangeParts = rangeHeader["bytes=".Length..].Split('-');
            var start = long.Parse(rangeParts[0]);
            var end = rangeParts.Length > 1 && long.TryParse(rangeParts[1], out var e) && e > 0
                ? Math.Min(e, fileLength - 1)
                : fileLength - 1;
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
