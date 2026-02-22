namespace flish.Contracts.Indexing;

public sealed record IndexStatusResponse(
    bool IsRunning,
    DateTime? LastCompletedAtUtc,
    int LastSeenFiles,
    int LastUpsertedFiles,
    int LastSoftDeletedFiles,
    string? LastError
);

