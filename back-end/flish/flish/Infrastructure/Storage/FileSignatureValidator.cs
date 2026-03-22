namespace flish.Infrastructure.Storage;

/// <summary>
/// Validates that the first bytes of a stream match known magic numbers for the claimed extension.
/// </summary>
public static class FileSignatureValidator
{
    private const int ReadAheadBytes = 64;

    public static async Task<bool> MatchesExtensionAsync(Stream stream, string extension, CancellationToken ct)
    {
        var ext = extension.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(ext))
            return false;

        if (stream.CanSeek && stream.Position != 0)
            stream.Position = 0;

        var buffer = new byte[ReadAheadBytes];
        var read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), ct);

        return ext switch
        {
            "jpg" or "jpeg" => StartsWith(buffer, read, [0xFF, 0xD8, 0xFF]),
            "png" => StartsWith(buffer, read, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            "gif" => read >= 6 && (StartsWithAscii(buffer, read, "GIF87a") || StartsWithAscii(buffer, read, "GIF89a")),
            "webp" => read >= 12
                && StartsWith(buffer, read, [0x52, 0x49, 0x46, 0x46])
                && buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50,
            "bmp" => StartsWith(buffer, read, [0x42, 0x4D]),
            "tiff" or "tif" => StartsWith(buffer, read, [0x49, 0x49, 0x2A, 0x00])
                || StartsWith(buffer, read, [0x4D, 0x4D, 0x00, 0x2A]),
            "ico" => read >= 4 && buffer[0] == 0x00 && buffer[1] == 0x00 && buffer[2] == 0x01 && buffer[3] == 0x00,
            "mp3" => read >= 3
                && (StartsWith(buffer, read, [0x49, 0x44, 0x33]) || (buffer[0] == 0xFF && (buffer[1] & 0xE0) == 0xE0)),
            "pdf" => read >= 5 && StartsWithAscii(buffer, read, "%PDF-"),
            "mp4" or "m4v" or "m4a" => IsIsoBmffFtyp(buffer, read),
            "mov" => IsIsoBmffFtyp(buffer, read),
            "webm" or "mkv" => read >= 4 && buffer[0] == 0x1A && buffer[1] == 0x45 && buffer[2] == 0xDF && buffer[3] == 0xA3,
            "wav" => read >= 12
                && StartsWith(buffer, read, [0x52, 0x49, 0x46, 0x46])
                && buffer[8] == 0x57 && buffer[9] == 0x41 && buffer[10] == 0x56 && buffer[11] == 0x45,
            "flac" => read >= 4 && buffer[0] == 0x66 && buffer[1] == 0x4C && buffer[2] == 0x61 && buffer[3] == 0x43,
            "ogg" or "opus" => read >= 4 && buffer[0] == 0x4F && buffer[1] == 0x67 && buffer[2] == 0x67 && buffer[3] == 0x53,
            "aac" => read >= 2 && buffer[0] == 0xFF && (buffer[1] & 0xF0) == 0xF0,
            "avi" => read >= 12
                && StartsWith(buffer, read, [0x52, 0x49, 0x46, 0x46])
                && buffer[8] == 0x41 && buffer[9] == 0x56 && buffer[10] == 0x49 && buffer[11] == 0x20,
            "wmv" or "wma" => read >= 16 && buffer[0] == 0x30 && buffer[1] == 0x26 && buffer[2] == 0xB2 && buffer[3] == 0x75,
            "svg" => LooksLikeSvg(buffer, read),
            "txt" or "json" or "xml" or "csv" or "md" => true,
            _ => true,
        };
    }

    private static bool LooksLikeSvg(byte[] buffer, int read)
    {
        if (read < 4) return false;
        var span = buffer.AsSpan(0, read);
        if (span.StartsWith("<?xml"u8)) return true;
        if (span.StartsWith("<svg"u8)) return true;
        if (read >= 3 && span[0] == 0xEF && span[1] == 0xBB && span[2] == 0xBF && read > 5)
            return span.Slice(3).StartsWith("<?xml"u8) || span.Slice(3).StartsWith("<svg"u8);
        return false;
    }

    private static bool IsIsoBmffFtyp(byte[] buffer, int read)
    {
        if (read < 12) return false;
        return buffer[4] == (byte)'f' && buffer[5] == (byte)'t' && buffer[6] == (byte)'y' && buffer[7] == (byte)'p';
    }

    private static bool StartsWith(byte[] buffer, int read, ReadOnlySpan<byte> signature)
    {
        if (read < signature.Length) return false;
        return buffer.AsSpan(0, signature.Length).SequenceEqual(signature);
    }

    private static bool StartsWithAscii(byte[] buffer, int read, string asciiPrefix)
    {
        var bytes = System.Text.Encoding.ASCII.GetBytes(asciiPrefix);
        if (read < bytes.Length) return false;
        return buffer.AsSpan(0, bytes.Length).SequenceEqual(bytes);
    }
}
