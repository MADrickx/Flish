namespace flish.Infrastructure.Persistence.Entities;

public class FileIndexEntry
{
    public Guid Id { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string MimeType { get; set; } = "application/octet-stream";
    public string Category { get; set; } = "other";
    public DateTime LastWriteUtc { get; set; }
    public DateTime CreatedUtc { get; set; }
    public string ShortCode { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
    public bool IsPublic { get; set; }
    public DateTime IndexedAtUtc { get; set; }
}

