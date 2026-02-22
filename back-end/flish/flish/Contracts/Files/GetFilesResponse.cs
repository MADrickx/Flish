namespace flish.Contracts.Files;

public sealed record FileItemDto(
    Guid Id,
    string RelativePath,
    string FileName,
    string Extension,
    long SizeBytes,
    string MimeType,
    DateTime LastWriteUtc,
    DateTime IndexedAtUtc
);

public sealed record PagedFilesResponse(
    IReadOnlyList<FileItemDto> Items,
    int Page,
    int PageSize,
    int Total
);

