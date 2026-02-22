namespace flish.Features.Indexing;

public interface IFileIndexer
{
    Task RunOnceAsync(CancellationToken cancellationToken);
    IndexerStatus GetStatus();
}

