using flish.Features.Auth;
using Xunit;

namespace flish.Tests;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void HashPassword_ReturnsNonEmptyHashAndSalt()
    {
        var (hash, salt) = _hasher.HashPassword("test123");

        Assert.False(string.IsNullOrWhiteSpace(hash));
        Assert.False(string.IsNullOrWhiteSpace(salt));
    }

    [Fact]
    public void Verify_CorrectPassword_ReturnsTrue()
    {
        var (hash, salt) = _hasher.HashPassword("MyPassword!");

        Assert.True(_hasher.Verify("MyPassword!", hash, salt));
    }

    [Fact]
    public void Verify_WrongPassword_ReturnsFalse()
    {
        var (hash, salt) = _hasher.HashPassword("CorrectPassword");

        Assert.False(_hasher.Verify("WrongPassword", hash, salt));
    }

    [Fact]
    public void HashPassword_DifferentCallsProduceDifferentSalts()
    {
        var (_, salt1) = _hasher.HashPassword("same");
        var (_, salt2) = _hasher.HashPassword("same");

        Assert.NotEqual(salt1, salt2);
    }

    [Fact]
    public void HashPassword_DifferentCallsProduceDifferentHashes()
    {
        var (hash1, _) = _hasher.HashPassword("same");
        var (hash2, _) = _hasher.HashPassword("same");

        Assert.NotEqual(hash1, hash2);
    }
}
