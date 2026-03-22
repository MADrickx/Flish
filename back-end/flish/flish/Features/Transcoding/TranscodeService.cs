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
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellations = new();
    private readonly ConcurrentDictionary<string, Process> _processes = new();

    public TranscodeJobStatus? GetJob(string jobId) =>
        _jobs.TryGetValue(jobId, out var job) ? job : null;

    public IReadOnlyList<TranscodeJobStatus> GetAllJobs() =>
        _jobs.Values.ToList();

    public string StartTranscode(FileIndexEntry entry)
    {
        var jobId = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var job = new TranscodeJobStatus { Id = jobId, FileId = entry.Id, FileName = entry.FileName };
        var cts = new CancellationTokenSource();

        _jobs[jobId] = job;
        _cancellations[jobId] = cts;

        _ = Task.Run(() => RunFfmpegAsync(entry, job, cts.Token));

        return jobId;
    }

    public bool CancelJob(string jobId)
    {
        if (!_jobs.TryGetValue(jobId, out var job))
            return false;

        if (job.Status is not ("queued" or "running"))
            return false;

        job.Status = "cancelled";

        if (_cancellations.TryRemove(jobId, out var cts))
        {
            cts.Cancel();
            cts.Dispose();
        }

        if (_processes.TryRemove(jobId, out var process))
        {
            try { if (!process.HasExited) process.Kill(entireProcessTree: true); }
            catch { /* process may have already exited */ }
        }

        logger.LogInformation("Transcode job {JobId} cancelled", jobId);
        return true;
    }

    private async Task RunFfmpegAsync(FileIndexEntry entry, TranscodeJobStatus job, CancellationToken ct)
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

            var psi = new ProcessStartInfo("ffmpeg")
            {
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            psi.ArgumentList.Add("-i");
            psi.ArgumentList.Add(inputPath);
            psi.ArgumentList.Add("-c:v");
            psi.ArgumentList.Add("libx264");
            psi.ArgumentList.Add("-c:a");
            psi.ArgumentList.Add("aac");
            psi.ArgumentList.Add("-movflags");
            psi.ArgumentList.Add("+faststart");
            psi.ArgumentList.Add("-y");
            psi.ArgumentList.Add(outputPath);

            using var process = Process.Start(psi);
            if (process is null)
            {
                job.Status = "failed";
                job.Error = "Failed to start FFmpeg process.";
                return;
            }

            _processes[job.Id] = process;

            var totalDuration = TimeSpan.Zero;

            while (await process.StandardError.ReadLineAsync(ct) is { } line)
            {
                if (ct.IsCancellationRequested) break;

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

            await process.WaitForExitAsync(ct);

            _processes.TryRemove(job.Id, out _);

            if (ct.IsCancellationRequested)
            {
                job.Status = "cancelled";
                if (File.Exists(outputPath) && !string.Equals(inputPath, outputPath, StringComparison.OrdinalIgnoreCase))
                    File.Delete(outputPath);
                return;
            }

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
        catch (OperationCanceledException)
        {
            job.Status = "cancelled";
            logger.LogInformation("Transcode job {JobId} was cancelled", job.Id);
        }
        catch (Exception ex)
        {
            job.Status = "failed";
            job.Error = ex.Message;
            logger.LogError(ex, "Transcode failed for file {Id}", job.FileId);
        }
        finally
        {
            _cancellations.TryRemove(job.Id, out _);
            _processes.TryRemove(job.Id, out _);
        }
    }

    [GeneratedRegex(@"Duration:\s+(\d{2}:\d{2}:\d{2}\.\d{2})")]
    private static partial Regex DurationPattern();

    [GeneratedRegex(@"time=(\d{2}:\d{2}:\d{2}\.\d{2})")]
    private static partial Regex TimePattern();
}
