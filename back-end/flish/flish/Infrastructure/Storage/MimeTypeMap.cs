using System.Collections.Frozen;

namespace flish.Infrastructure.Storage;

public static class MimeTypeMap
{
    private static readonly FrozenDictionary<string, (string MimeType, string Category)> Map =
        new Dictionary<string, (string, string)>(StringComparer.OrdinalIgnoreCase)
        {
            // Video
            ["mp4"] = ("video/mp4", "video"),
            ["mkv"] = ("video/x-matroska", "video"),
            ["webm"] = ("video/webm", "video"),
            ["avi"] = ("video/x-msvideo", "video"),
            ["mov"] = ("video/quicktime", "video"),
            ["m4v"] = ("video/x-m4v", "video"),
            ["wmv"] = ("video/x-ms-wmv", "video"),

            // Audio
            ["mp3"] = ("audio/mpeg", "audio"),
            ["flac"] = ("audio/flac", "audio"),
            ["wav"] = ("audio/wav", "audio"),
            ["ogg"] = ("audio/ogg", "audio"),
            ["aac"] = ("audio/aac", "audio"),
            ["m4a"] = ("audio/mp4", "audio"),
            ["wma"] = ("audio/x-ms-wma", "audio"),
            ["opus"] = ("audio/opus", "audio"),

            // Photo
            ["jpg"] = ("image/jpeg", "photo"),
            ["jpeg"] = ("image/jpeg", "photo"),
            ["png"] = ("image/png", "photo"),
            ["gif"] = ("image/gif", "photo"),
            ["webp"] = ("image/webp", "photo"),
            ["bmp"] = ("image/bmp", "photo"),
            ["svg"] = ("image/svg+xml", "photo"),
            ["tiff"] = ("image/tiff", "photo"),
            ["ico"] = ("image/x-icon", "photo"),

            // Document
            ["pdf"] = ("application/pdf", "document"),
            ["txt"] = ("text/plain", "document"),
            ["json"] = ("application/json", "document"),
            ["xml"] = ("application/xml", "document"),
            ["csv"] = ("text/csv", "document"),
            ["md"] = ("text/markdown", "document"),
        }.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);

    public static string GetMimeType(string extension)
    {
        return Map.TryGetValue(extension, out var entry) ? entry.MimeType : "application/octet-stream";
    }

    public static string GetCategory(string extension)
    {
        return Map.TryGetValue(extension, out var entry) ? entry.Category : "other";
    }
}
