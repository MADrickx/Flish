namespace flish.Infrastructure.Persistence.Entities;

public class FileIndexEntry
{
    public Guid Id { get; set; }
    public string RelativePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Extension { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string MimeType { get; set; } = "application/octet-stream";
    public DateTime LastWriteUtc { get; set; }
    public DateTime CreatedUtc { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime IndexedAtUtc { get; set; }
}

