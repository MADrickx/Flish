using flish.Configuration;
using Microsoft.Extensions.Options;

namespace flish.Infrastructure.Storage;

public sealed class FilePathResolver(IOptions<StorageOptions> storageOptions)
{
    private readonly string _masterDirectory = Path.GetFullPath(storageOptions.Value.MasterDirectory);

    public string MasterDirectory => _masterDirectory;

    public string ToAbsolutePath(string relativePath)
    {
        var clean = relativePath.Replace('\\', '/').TrimStart('/');
        var combined = Path.GetFullPath(Path.Combine(_masterDirectory, clean));
        if (!combined.StartsWith(_masterDirectory, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Path escapes master directory.");
        }

        return combined;
    }

    public string ToRelativePath(string absolutePath)
    {
        var full = Path.GetFullPath(absolutePath);
        if (!full.StartsWith(_masterDirectory, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Path outside master directory.");
        }

        var relative = Path.GetRelativePath(_masterDirectory, full);
        return relative.Replace('\\', '/');
    }
}

