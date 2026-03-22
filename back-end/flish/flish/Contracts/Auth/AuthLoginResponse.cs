namespace flish.Contracts.Auth;

public sealed record AuthLoginResponse(string Username, string AccessToken, string RefreshToken, int ExpiresInSeconds);
