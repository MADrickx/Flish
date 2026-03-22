namespace flish.Configuration;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SecretKey { get; set; } = "CHANGE_ME_USE_AT_LEAST_64_CHARS_FOR_HMAC_SHA256_KEY_SECURITY";
    public string Issuer { get; set; } = "flish";
    public string Audience { get; set; } = "flish-client";
    public int ExpirationMinutes { get; set; } = 15;
    public int RefreshTokenExpirationDays { get; set; } = 7;
}
