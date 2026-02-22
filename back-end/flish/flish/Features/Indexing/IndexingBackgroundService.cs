using flish.Configuration;
using Microsoft.Extensions.Options;

namespace flish.Features.Indexing;

public sealed class IndexingBackgroundService(
    IFileIndexer fileIndexer,
    IOptions<IndexingOptions> indexingOptions,
    ILogger<IndexingBackgroundService> logger
) : BackgroundService
{
    private readonly IFileIndexer _fileIndexer = fileIndexer;
    private readonly IndexingOptions _indexingOptions = indexingOptions.Value;
    private readonly ILogger<IndexingBackgroundService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_indexingOptions.RunStartupScan)
        {
            await TryScanAsync(stoppingToken);
        }

        var interval = TimeSpan.FromSeconds(Math.Max(15, _indexingOptions.ScanIntervalSeconds));
        using var timer = new PeriodicTimer(interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await TryScanAsync(stoppingToken);
        }
    }

    private async Task TryScanAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _fileIndexer.RunOnceAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Periodic index scan failed.");
        }
    }
}

