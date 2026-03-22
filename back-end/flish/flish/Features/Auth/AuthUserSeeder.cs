using flish.Configuration;
using flish.Infrastructure.Persistence;
using flish.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace flish.Features.Auth;

public sealed class AuthUserSeeder(
    FlishDbContext dbContext,
    IPasswordHasher passwordHasher,
    IOptions<BasicAuthOptions> basicAuthOptions
)
{
    private readonly FlishDbContext _dbContext = dbContext;
    private readonly IPasswordHasher _passwordHasher = passwordHasher;
    private readonly BasicAuthOptions _authOptions = basicAuthOptions.Value;

    public async Task SeedAsync(CancellationToken cancellationToken)
    {
        await _dbContext.Database.EnsureCreatedAsync(cancellationToken);

        var username = _authOptions.SeedUser.Username.Trim();
        if (string.IsNullOrWhiteSpace(username))
        {
            return;
        }

        var exists = await _dbContext.Users.AnyAsync(x => x.Username == username, cancellationToken);
        if (exists)
        {
            return;
        }

        var (hash, salt) = _passwordHasher.HashPassword(_authOptions.SeedUser.Password);
        _dbContext.Users.Add(new AppUser
        {
            Id = Guid.NewGuid(),
            Username = username,
            PasswordHash = hash,
            PasswordSalt = salt,
            CreatedUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}

