using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text;
using flish.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace flish.Features.Auth;

public sealed class BasicAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IPasswordHasher passwordHasher,
    FlishDbContext dbContext
) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    private readonly IPasswordHasher _passwordHasher = passwordHasher;
    private readonly FlishDbContext _dbContext = dbContext;

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var headerValue = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(headerValue) || !headerValue.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        string username;
        string password;
        try
        {
            var parameter = AuthenticationHeaderValue.Parse(headerValue).Parameter;
            if (string.IsNullOrWhiteSpace(parameter))
            {
                return AuthenticateResult.Fail("Invalid authorization header.");
            }

            var raw = Encoding.UTF8.GetString(Convert.FromBase64String(parameter));
            var separatorIndex = raw.IndexOf(':');
            if (separatorIndex <= 0)
            {
                return AuthenticateResult.Fail("Invalid basic credentials.");
            }

            username = raw[..separatorIndex];
            password = raw[(separatorIndex + 1)..];
        }
        catch
        {
            return AuthenticateResult.Fail("Invalid authorization header.");
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.Username == username);
        if (user is null || !_passwordHasher.Verify(password, user.PasswordHash, user.PasswordSalt))
        {
            return AuthenticateResult.Fail("Invalid username or password.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return AuthenticateResult.Success(ticket);
    }
}

