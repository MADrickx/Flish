namespace flish.Features.Transcoding;

public sealed record TranscodeJobStatus
{
    public required string Id { get; init; }
    public required Guid FileId { get; init; }
    public string FileName { get; set; } = "";
    public string Status { get; set; } = "queued";
    public int ProgressPercent { get; set; }
    public string? OutputPath { get; set; }
    public string? Error { get; set; }
}
