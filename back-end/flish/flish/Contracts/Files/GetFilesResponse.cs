namespace flish.Contracts.Files;

public sealed record FileItemDto(
    Guid Id,
    string RelativePath,
    string FileName,
    string Extension,
    long SizeBytes,
    string MimeType,
    string Category,
    string ShortCode,
    bool IsPublic,
    DateTime LastWriteUtc,
    DateTime IndexedAtUtc
);

public sealed record PagedFilesResponse(
    IReadOnlyList<FileItemDto> Items,
    int Page,
    int PageSize,
    int Total
);

public sealed record GroupedFileDto(
    string BaseName,
    string RelativeDirectory,
    IReadOnlyList<FileItemDto> Variants
);

public sealed record PagedGroupedResponse(
    IReadOnlyList<GroupedFileDto> Items,
    int Page,
    int PageSize,
    int Total
);

public sealed record RenameFileRequest(string NewFileName);

public sealed record VisibilityRequest(bool IsPublic);
