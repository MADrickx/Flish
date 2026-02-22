namespace flish.Configuration;

public sealed class IndexingOptions
{
    public const string SectionName = "Indexing";

    public int ScanIntervalSeconds { get; set; } = 300;
    public bool RunStartupScan { get; set; } = true;
}

