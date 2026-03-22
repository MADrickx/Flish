using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.RegularExpressions;
using flish.Features.Indexing;
using flish.Infrastructure.Persistence.Entities;
using flish.Infrastructure.Storage;

namespace flish.Features.Transcoding;

public sealed partial class TranscodeService(
    FilePathResolver pathResolver,
    IFileIndexer fileIndexer,
    ILogger<TranscodeService> logger
)
{
    private readonly ConcurrentDictionary<string, TranscodeJobStatus> _jobs = new();

    public TranscodeJobStatus? GetJob(string jobId) =>
        _jobs.TryGetValue(jobId, out var job) ? job : null;

    public string StartTranscode(FileIndexEntry entry)
    {
        var jobId = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var job = new TranscodeJobStatus { Id = jobId, FileId = entry.Id };
        _jobs[jobId] = job;

        _ = Task.Run(() => RunFfmpegAsync(entry, job));

        return jobId;
    }

    private async Task RunFfmpegAsync(FileIndexEntry entry, TranscodeJobStatus job)
    {
        try
        {
            var inputPath = pathResolver.ToAbsolutePath(entry.RelativePath);
            var outputPath = Path.ChangeExtension(inputPath, ".mp4");

            if (string.Equals(Path.GetExtension(inputPath), ".mp4", StringComparison.OrdinalIgnoreCase))
            {
                job.Status = "failed";
                job.Error = "File is already MP4.";
                return;
            }

            job.Status = "running";

            var psi = new ProcessStartInfo
            {
                FileName = "ffmpeg",
                Arguments = $"-i \"{inputPath}\" -c:v libx264 -c:a aac -movflags +faststart -y \"{outputPath}\"",
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };

            using var process = Process.Start(psi);
            if (process is null)
            {
                job.Status = "failed";
                job.Error = "Failed to start FFmpeg process.";
                return;
            }

            var totalDuration = TimeSpan.Zero;

            while (await process.StandardError.ReadLineAsync() is { } line)
            {
                var durationMatch = DurationPattern().Match(line);
                if (durationMatch.Success && totalDuration == TimeSpan.Zero)
                {
                    totalDuration = TimeSpan.Parse(durationMatch.Groups[1].Value);
                }

                var timeMatch = TimePattern().Match(line);
                if (timeMatch.Success && totalDuration > TimeSpan.Zero)
                {
                    var current = TimeSpan.Parse(timeMatch.Groups[1].Value);
                    job.ProgressPercent = Math.Min(100, (int)(current / totalDuration * 100));
                }
            }

            await process.WaitForExitAsync();

            if (process.ExitCode == 0 && File.Exists(outputPath))
            {
                if (File.Exists(inputPath) && !string.Equals(inputPath, outputPath, StringComparison.OrdinalIgnoreCase))
                {
                    File.Delete(inputPath);
                    logger.LogInformation("Deleted original file: {Input}", entry.RelativePath);
                }

                job.Status = "completed";
                job.ProgressPercent = 100;
                job.OutputPath = pathResolver.ToRelativePath(outputPath);

                await fileIndexer.RunOnceAsync(CancellationToken.None);

                logger.LogInformation("Transcode completed: {Input} -> {Output}", entry.RelativePath, job.OutputPath);
            }
            else
            {
                job.Status = "failed";
                job.Error = $"FFmpeg exited with code {process.ExitCode}.";
                logger.LogError("Transcode failed for {Input} with exit code {Code}", entry.RelativePath, process.ExitCode);
            }
        }
        catch (Exception ex)
        {
            job.Status = "failed";
            job.Error = ex.Message;
            logger.LogError(ex, "Transcode failed for file {Id}", job.FileId);
        }
    }

    [GeneratedRegex(@"Duration:\s+(\d{2}:\d{2}:\d{2}\.\d{2})")]
    private static partial Regex DurationPattern();

    [GeneratedRegex(@"time=(\d{2}:\d{2}:\d{2}\.\d{2})")]
    private static partial Regex TimePattern();
}
