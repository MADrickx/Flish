namespace flish.Features.Indexing;

public sealed class IndexerStatus
{
    public bool IsRunning { get; set; }
    public DateTime? LastCompletedAtUtc { get; set; }
    public int LastSeenFiles { get; set; }
    public int LastUpsertedFiles { get; set; }
    public int LastSoftDeletedFiles { get; set; }
    public string? LastError { get; set; }
}

