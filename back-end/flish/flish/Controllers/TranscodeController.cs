using flish.Features.Transcoding;
using flish.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace flish.Controllers;

[ApiController]
[Route("api")]
public class TranscodeController(
    FileIndexRepository repo,
    TranscodeService transcodeService
) : ControllerBase
{
    [HttpPost("files/{id:guid}/transcode")]
    [EnableRateLimiting("writes")]
    public async Task<IActionResult> StartTranscode(Guid id, CancellationToken ct)
    {
        var entry = await repo.GetActiveByIdAsync(id, ct);
        if (entry is null) return NotFound();
        if (entry.Category != "video")
            return BadRequest(new { error = "Only video files can be transcoded." });
        if (string.Equals(entry.Extension, "mp4", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "File is already MP4." });

        var jobId = transcodeService.StartTranscode(entry);
        return Accepted($"/api/transcode/{jobId}/status", new { jobId });
    }

    [HttpGet("transcode/{jobId}/status")]
    public IActionResult GetJobStatus(string jobId)
    {
        var job = transcodeService.GetJob(jobId);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpGet("transcode/jobs")]
    public IActionResult GetAllJobs()
    {
        return Ok(transcodeService.GetAllJobs());
    }

    [HttpDelete("transcode/{jobId}")]
    [EnableRateLimiting("writes")]
    public IActionResult CancelJob(string jobId)
    {
        return transcodeService.CancelJob(jobId) ? NoContent() : NotFound();
    }
}
