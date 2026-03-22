using flish.Infrastructure.Persistence;
using flish.Infrastructure.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace flish.Controllers;

[ApiController]
[EnableRateLimiting("public-stream")]
public class StreamLinkController(
    FileIndexRepository repo,
    FilePathResolver pathResolver
) : ControllerBase
{
    [HttpGet("/s/{code}")]
    [Authorize]
    public async Task<IResult> SecureStream(string code, CancellationToken ct)
    {
        var entry = await repo.GetByShortCodeAsync(code.ToUpperInvariant(), ct);
        if (entry is null) return Results.NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!System.IO.File.Exists(absolutePath)) return Results.NotFound();

        return await StreamHelper.StreamFileAsync(absolutePath, entry.MimeType, HttpContext, ct);
    }

    [HttpGet("/p/{code}")]
    [AllowAnonymous]
    public async Task<IResult> PublicStream(string code, CancellationToken ct)
    {
        var entry = await repo.GetByShortCodeAsync(code.ToUpperInvariant(), ct);
        if (entry is null || !entry.IsPublic) return Results.NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!System.IO.File.Exists(absolutePath)) return Results.NotFound();

        return await StreamHelper.StreamFileAsync(absolutePath, entry.MimeType, HttpContext, ct);
    }
}
