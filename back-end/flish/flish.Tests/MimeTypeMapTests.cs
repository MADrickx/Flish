using flish.Infrastructure.Storage;
using Xunit;

namespace flish.Tests;

public class MimeTypeMapTests
{
    [Theory]
    [InlineData("mp4", "video/mp4")]
    [InlineData("mkv", "video/x-matroska")]
    [InlineData("webm", "video/webm")]
    [InlineData("mp3", "audio/mpeg")]
    [InlineData("flac", "audio/flac")]
    [InlineData("wav", "audio/wav")]
    [InlineData("jpg", "image/jpeg")]
    [InlineData("jpeg", "image/jpeg")]
    [InlineData("png", "image/png")]
    [InlineData("gif", "image/gif")]
    [InlineData("pdf", "application/pdf")]
    [InlineData("txt", "text/plain")]
    public void GetMimeType_KnownExtension_ReturnsCorrectType(string ext, string expected)
    {
        Assert.Equal(expected, MimeTypeMap.GetMimeType(ext));
    }

    [Fact]
    public void GetMimeType_UnknownExtension_ReturnsOctetStream()
    {
        Assert.Equal("application/octet-stream", MimeTypeMap.GetMimeType("xyz"));
    }

    [Theory]
    [InlineData("mp4", "video")]
    [InlineData("avi", "video")]
    [InlineData("mp3", "audio")]
    [InlineData("ogg", "audio")]
    [InlineData("jpg", "photo")]
    [InlineData("png", "photo")]
    [InlineData("webp", "photo")]
    [InlineData("pdf", "document")]
    [InlineData("json", "document")]
    public void GetCategory_KnownExtension_ReturnsCorrectCategory(string ext, string expected)
    {
        Assert.Equal(expected, MimeTypeMap.GetCategory(ext));
    }

    [Fact]
    public void GetCategory_UnknownExtension_ReturnsOther()
    {
        Assert.Equal("other", MimeTypeMap.GetCategory("xyz"));
    }

    [Fact]
    public void GetMimeType_IsCaseInsensitive()
    {
        Assert.Equal(MimeTypeMap.GetMimeType("MP4"), MimeTypeMap.GetMimeType("mp4"));
        Assert.Equal(MimeTypeMap.GetMimeType("Jpg"), MimeTypeMap.GetMimeType("jpg"));
    }
}
