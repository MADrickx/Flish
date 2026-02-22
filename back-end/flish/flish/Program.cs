using System.Security.Claims;
using flish.Configuration;
using flish.Contracts.Auth;
using flish.Contracts.Files;
using flish.Contracts.Indexing;
using flish.Features.Auth;
using flish.Features.Indexing;
using flish.Infrastructure.Persistence;
using flish.Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.SectionName));
builder.Services.Configure<IndexingOptions>(builder.Configuration.GetSection(IndexingOptions.SectionName));
builder.Services.Configure<BasicAuthOptions>(builder.Configuration.GetSection(BasicAuthOptions.SectionName));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
builder.Services.AddDbContext<FlishDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.Configure<FormOptions>(options =>
{
    var maxUploadBytes = builder.Configuration.GetValue<long>("Storage:MaxUploadBytes", 524_288_000);
    options.MultipartBodyLengthLimit = maxUploadBytes;
});

builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.AddAuthentication("Basic")
    .AddScheme<AuthenticationSchemeOptions, BasicAuthenticationHandler>("Basic", _ => { });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("writes", limiter =>
    {
        limiter.PermitLimit = 20;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
});

builder.Services.AddSingleton<FilePathResolver>();
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<AuthUserSeeder>();
builder.Services.AddSingleton<IFileIndexer, FileIndexer>();
builder.Services.AddHostedService<IndexingBackgroundService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<AuthUserSeeder>();
    await seeder.SeedAsync(CancellationToken.None);
}

app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

var api = app.MapGroup("/api").RequireAuthorization();

api.MapPost("/auth/login", (ClaimsPrincipal user) =>
{
    var username = user.Identity?.Name ?? string.Empty;
    return Results.Ok(new AuthLoginResponse(username));
});

api.MapGet("/files", async (
        int page,
        int pageSize,
        string? query,
        string? extension,
        FlishDbContext dbContext,
        CancellationToken cancellationToken) =>
    {
        page = Math.Max(1, page == 0 ? 1 : page);
        pageSize = Math.Clamp(pageSize == 0 ? 50 : pageSize, 1, 200);

        var filesQuery = dbContext.FileIndexEntries
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query))
        {
            filesQuery = filesQuery.Where(x => x.RelativePath.Contains(query));
        }

        if (!string.IsNullOrWhiteSpace(extension))
        {
            var normalized = extension.TrimStart('.').ToLowerInvariant();
            filesQuery = filesQuery.Where(x => x.Extension == normalized);
        }

        var total = await filesQuery.CountAsync(cancellationToken);
        var items = await filesQuery
            .OrderBy(x => x.RelativePath)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new FileItemDto(
                x.Id,
                x.RelativePath,
                x.FileName,
                x.Extension,
                x.SizeBytes,
                x.MimeType,
                x.LastWriteUtc,
                x.IndexedAtUtc
            ))
            .ToListAsync(cancellationToken);

        return Results.Ok(new PagedFilesResponse(items, page, pageSize, total));
    })
    .WithName("GetFiles");

api.MapGet("/files/{id:guid}", async (Guid id, FlishDbContext dbContext, CancellationToken cancellationToken) =>
{
    var item = await dbContext.FileIndexEntries
        .AsNoTracking()
        .Where(x => !x.IsDeleted && x.Id == id)
        .Select(x => new FileItemDto(
            x.Id,
            x.RelativePath,
            x.FileName,
            x.Extension,
            x.SizeBytes,
            x.MimeType,
            x.LastWriteUtc,
            x.IndexedAtUtc
        ))
        .FirstOrDefaultAsync(cancellationToken);

    return item is null ? Results.NotFound() : Results.Ok(item);
});

api.MapGet("/files/{id:guid}/download", async (
        Guid id,
        FlishDbContext dbContext,
        FilePathResolver pathResolver,
        CancellationToken cancellationToken) =>
    {
        var entry = await dbContext.FileIndexEntries
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (entry is null)
        {
            return Results.NotFound();
        }

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!File.Exists(absolutePath))
        {
            return Results.NotFound();
        }

        var stream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, useAsync: true);
        return Results.File(stream, entry.MimeType, entry.FileName, enableRangeProcessing: true);
    });

api.MapPost("/files/upload", async (
        IFormFile file,
        string? relativeDirectory,
        FlishDbContext dbContext,
        FilePathResolver pathResolver,
        IFileIndexer indexer,
        IOptions<StorageOptions> storageOptions,
        CancellationToken cancellationToken) =>
    {
        if (file.Length <= 0)
        {
            return Results.BadRequest("Uploaded file is empty.");
        }

        if (file.Length > storageOptions.Value.MaxUploadBytes)
        {
            return Results.BadRequest("Uploaded file exceeds max upload size.");
        }

        var safeDirectory = string.IsNullOrWhiteSpace(relativeDirectory) ? string.Empty : relativeDirectory.Trim();
        var combinedRelative = Path.Combine(safeDirectory, Path.GetFileName(file.FileName)).Replace('\\', '/');
        var absolutePath = pathResolver.ToAbsolutePath(combinedRelative);
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        await using (var fs = new FileStream(absolutePath, FileMode.Create, FileAccess.Write, FileShare.None, 64 * 1024, true))
        {
            await file.CopyToAsync(fs, cancellationToken);
        }

        await indexer.RunOnceAsync(cancellationToken);
        return Results.Created($"/api/files/upload", new { path = combinedRelative });
    })
    .RequireRateLimiting("writes");

api.MapDelete("/files/{id:guid}", async (
        Guid id,
        FlishDbContext dbContext,
        FilePathResolver pathResolver,
        CancellationToken cancellationToken) =>
    {
        var entry = await dbContext.FileIndexEntries.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (entry is null)
        {
            return Results.NotFound();
        }

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (File.Exists(absolutePath))
        {
            File.Delete(absolutePath);
        }

        entry.IsDeleted = true;
        entry.IndexedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    })
    .RequireRateLimiting("writes");

api.MapGet("/index/status", (IFileIndexer indexer) =>
{
    var status = indexer.GetStatus();
    return Results.Ok(new IndexStatusResponse(
        status.IsRunning,
        status.LastCompletedAtUtc,
        status.LastSeenFiles,
        status.LastUpsertedFiles,
        status.LastSoftDeletedFiles,
        status.LastError
    ));
});

api.MapPost("/index/rebuild", async (IFileIndexer indexer, CancellationToken cancellationToken) =>
{
    await indexer.RunOnceAsync(cancellationToken);
    return Results.Accepted("/api/index/status");
}).RequireRateLimiting("writes");

app.Run();