using flish.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace flish.Infrastructure.Persistence;

public class FlishDbContext(DbContextOptions<FlishDbContext> options) : DbContext(options)
{
    public DbSet<FileIndexEntry> FileIndexEntries => Set<FileIndexEntry>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FileIndexEntry>(entity =>
        {
            entity.ToTable("file_index_entries");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RelativePath).HasMaxLength(2048).IsRequired();
            entity.Property(x => x.FileName).HasMaxLength(1024).IsRequired();
            entity.Property(x => x.Extension).HasMaxLength(64);
            entity.Property(x => x.MimeType).HasMaxLength(255).IsRequired();
            entity.Property(x => x.Category).HasMaxLength(32).IsRequired();
            entity.HasIndex(x => x.RelativePath).IsUnique();
            entity.Property(x => x.ShortCode).HasMaxLength(8).IsRequired();
            entity.HasIndex(x => x.ShortCode).IsUnique();
            entity.HasIndex(x => x.IsDeleted);
            entity.HasIndex(x => x.Category);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Username).HasMaxLength(128).IsRequired();
            entity.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
            entity.Property(x => x.PasswordSalt).HasMaxLength(256).IsRequired();
            entity.HasIndex(x => x.Username).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => x.UserId);
        });
    }
}
