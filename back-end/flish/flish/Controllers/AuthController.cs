using System.Security.Claims;
using flish.Configuration;
using flish.Contracts.Auth;
using flish.Features.Auth;
using flish.Infrastructure.Persistence;
using flish.Infrastructure.Persistence.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace flish.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController(
    FlishDbContext dbContext,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions
) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Username and password are required.", status = 400 });

        var user = await dbContext.Users
            .FirstOrDefaultAsync(x => x.Username == request.Username.Trim(), ct);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash, user.PasswordSalt))
            return Unauthorized();

        var accessToken = jwtTokenService.GenerateAccessToken(user.Id, user.Username);
        var rawRefreshToken = jwtTokenService.GenerateRefreshToken();
        var refreshTokenHash = jwtTokenService.HashToken(rawRefreshToken);

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresUtc = DateTime.UtcNow.AddDays(jwtOptions.Value.RefreshTokenExpirationDays),
            CreatedUtc = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync(ct);

        var expiresInSeconds = jwtOptions.Value.ExpirationMinutes * 60;
        return Ok(new AuthLoginResponse(user.Username, accessToken, rawRefreshToken, expiresInSeconds));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh(RefreshRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { error = "Refresh token is required.", status = 400 });

        var tokenHash = jwtTokenService.HashToken(request.RefreshToken);
        var storedToken = await dbContext.RefreshTokens
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);

        if (storedToken is null)
            return Unauthorized();

        if (storedToken.IsRevoked)
        {
            await dbContext.RefreshTokens
                .Where(x => x.UserId == storedToken.UserId)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsRevoked, true), ct);
            return Unauthorized();
        }

        if (storedToken.ExpiresUtc <= DateTime.UtcNow)
        {
            storedToken.IsRevoked = true;
            await dbContext.SaveChangesAsync(ct);
            return Unauthorized();
        }

        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.Id == storedToken.UserId, ct);
        if (user is null)
            return Unauthorized();

        storedToken.IsRevoked = true;

        var newRawRefreshToken = jwtTokenService.GenerateRefreshToken();
        var newRefreshTokenHash = jwtTokenService.HashToken(newRawRefreshToken);
        var newTokenId = Guid.NewGuid();

        storedToken.ReplacedByTokenId = newTokenId;

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            Id = newTokenId,
            UserId = user.Id,
            TokenHash = newRefreshTokenHash,
            ExpiresUtc = DateTime.UtcNow.AddDays(jwtOptions.Value.RefreshTokenExpirationDays),
            CreatedUtc = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync(ct);

        var accessToken = jwtTokenService.GenerateAccessToken(user.Id, user.Username);
        var expiresInSeconds = jwtOptions.Value.ExpirationMinutes * 60;
        return Ok(new AuthLoginResponse(user.Username, accessToken, newRawRefreshToken, expiresInSeconds));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return BadRequest(new { error = "Refresh token is required.", status = 400 });

        var tokenHash = jwtTokenService.HashToken(request.RefreshToken);
        var storedToken = await dbContext.RefreshTokens
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);

        if (storedToken is not null)
        {
            storedToken.IsRevoked = true;
            await dbContext.SaveChangesAsync(ct);
        }

        return Ok(new { message = "Logged out." });
    }

    [HttpPost("change-password")]
    [EnableRateLimiting("writes")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        var username = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(username))
            return Unauthorized();

        var appUser = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == username, ct);
        if (appUser is null)
            return NotFound();

        if (!passwordHasher.Verify(request.CurrentPassword, appUser.PasswordHash, appUser.PasswordSalt))
            return BadRequest(new { error = "Current password is incorrect.", status = 400 });

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            return BadRequest(new { error = "New password must be at least 8 characters.", status = 400 });

        var (hash, salt) = passwordHasher.HashPassword(request.NewPassword);
        appUser.PasswordHash = hash;
        appUser.PasswordSalt = salt;

        await dbContext.RefreshTokens
            .Where(x => x.UserId == appUser.Id && !x.IsRevoked)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsRevoked, true), ct);

        await dbContext.SaveChangesAsync(ct);

        return Ok(new { message = "Password changed. Please log in again." });
    }
}
