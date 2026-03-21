using flish.Configuration;
using flish.Infrastructure.Storage;
using Microsoft.Extensions.Options;
using Xunit;

namespace flish.Tests;

public class FilePathResolverTests
{
    private static FilePathResolver CreateResolver(string masterDir)
    {
        var options = Options.Create(new StorageOptions { MasterDirectory = masterDir });
        return new FilePathResolver(options);
    }

    [Fact]
    public void ToAbsolutePath_ValidRelative_ReturnsFullPath()
    {
        var dir = Path.GetTempPath();
        var resolver = CreateResolver(dir);

        var result = resolver.ToAbsolutePath("sub/file.txt");

        Assert.StartsWith(Path.GetFullPath(dir), result);
        Assert.EndsWith("file.txt", result);
    }

    [Fact]
    public void ToAbsolutePath_TraversalAttempt_Throws()
    {
        var dir = Path.Combine(Path.GetTempPath(), "master");
        var resolver = CreateResolver(dir);

        Assert.Throws<InvalidOperationException>(() => resolver.ToAbsolutePath("../../etc/passwd"));
    }

    [Fact]
    public void ToAbsolutePath_BackslashNormalized()
    {
        var dir = Path.GetTempPath();
        var resolver = CreateResolver(dir);

        var result = resolver.ToAbsolutePath("sub\\file.txt");

        Assert.Contains("file.txt", result);
        Assert.StartsWith(Path.GetFullPath(dir), result);
    }

    [Fact]
    public void ToAbsolutePath_LeadingSlashStripped()
    {
        var dir = Path.GetTempPath();
        var resolver = CreateResolver(dir);

        var result = resolver.ToAbsolutePath("/sub/file.txt");

        Assert.StartsWith(Path.GetFullPath(dir), result);
    }

    [Fact]
    public void ToRelativePath_ValidAbsolute_ReturnsRelative()
    {
        var dir = Path.GetTempPath();
        var resolver = CreateResolver(dir);
        var absolute = Path.Combine(Path.GetFullPath(dir), "sub", "file.txt");

        var result = resolver.ToRelativePath(absolute);

        Assert.Equal("sub/file.txt", result);
    }

    [Fact]
    public void ToRelativePath_OutsideMasterDir_Throws()
    {
        var dir = Path.Combine(Path.GetTempPath(), "master");
        var resolver = CreateResolver(dir);
        var outside = Path.Combine(Path.GetTempPath(), "other", "file.txt");

        Assert.Throws<InvalidOperationException>(() => resolver.ToRelativePath(outside));
    }

    [Fact]
    public void MasterDirectory_ReturnsFullPath()
    {
        var resolver = CreateResolver("./storage");

        Assert.True(Path.IsPathRooted(resolver.MasterDirectory));
    }
}
