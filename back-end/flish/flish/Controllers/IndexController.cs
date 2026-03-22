using flish.Contracts.Indexing;
using flish.Features.Indexing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace flish.Controllers;

[ApiController]
[Route("api/index")]
public class IndexController(IFileIndexer indexer) : ControllerBase
{
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var status = indexer.GetStatus();
        return Ok(new IndexStatusResponse(
            status.IsRunning,
            status.LastCompletedAtUtc,
            status.LastSeenFiles,
            status.LastUpsertedFiles,
            status.LastSoftDeletedFiles,
            status.LastError
        ));
    }

    [HttpPost("rebuild")]
    [EnableRateLimiting("writes")]
    public async Task<IActionResult> Rebuild(CancellationToken ct)
    {
        await indexer.RunOnceAsync(ct);
        return Accepted("/api/index/status");
    }
}
