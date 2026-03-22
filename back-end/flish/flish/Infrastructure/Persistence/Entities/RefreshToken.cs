namespace flish.Infrastructure.Persistence.Entities;

public class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresUtc { get; set; }
    public DateTime CreatedUtc { get; set; }
    public bool IsRevoked { get; set; }
    public Guid? ReplacedByTokenId { get; set; }
}
