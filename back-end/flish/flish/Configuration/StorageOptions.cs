namespace flish.Configuration;

public sealed class StorageOptions
{
    public const string SectionName = "Storage";

    public string MasterDirectory { get; set; } = "./storage";
    public long MaxUploadBytes { get; set; } = 524_288_000;
}

