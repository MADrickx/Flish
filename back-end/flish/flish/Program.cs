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
builder.Services.AddDbContextFactory<FlishDbContext>(options => options.UseNpgsql(connectionString));

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
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<FileIndexRepository>();
builder.Services.AddSingleton<IFileIndexer, FileIndexer>();
builder.Services.AddHostedService<IndexingBackgroundService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler(error => error.Run(async context =>
{
    var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
    var statusCode = exception switch
    {
        InvalidOperationException => StatusCodes.Status400BadRequest,
        FileNotFoundException => StatusCodes.Status404NotFound,
        _ => StatusCodes.Status500InternalServerError
    };
    context.Response.StatusCode = statusCode;
    context.Response.ContentType = "application/json";
    var message = app.Environment.IsDevelopment() ? exception?.Message ?? "Unexpected error" : "An error occurred";
    await context.Response.WriteAsJsonAsync(new { error = message, status = statusCode });
}));

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

api.MapPost("/auth/change-password", async (
        ChangePasswordRequest request,
        ClaimsPrincipal user,
        FlishDbContext dbContext,
        IPasswordHasher passwordHasher,
        CancellationToken cancellationToken) =>
    {
        var username = user.Identity?.Name;
        if (string.IsNullOrWhiteSpace(username))
            return Results.Unauthorized();

        var appUser = await dbContext.Users.FirstOrDefaultAsync(x => x.Username == username, cancellationToken);
        if (appUser is null)
            return Results.NotFound();

        if (!passwordHasher.Verify(request.CurrentPassword, appUser.PasswordHash, appUser.PasswordSalt))
            return Results.BadRequest(new { error = "Current password is incorrect.", status = 400 });

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            return Results.BadRequest(new { error = "New password must be at least 8 characters.", status = 400 });

        var (hash, salt) = passwordHasher.HashPassword(request.NewPassword);
        appUser.PasswordHash = hash;
        appUser.PasswordSalt = salt;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Results.Ok(new { message = "Password changed." });
    })
    .RequireRateLimiting("writes");

api.MapGet("/files", async (
        int page,
        int pageSize,
        string? query,
        string? extension,
        string? category,
        FileIndexRepository repo,
        CancellationToken cancellationToken) =>
    {
        page = Math.Max(1, page == 0 ? 1 : page);
        pageSize = Math.Clamp(pageSize == 0 ? 50 : pageSize, 1, 200);

        var (items, total) = await repo.GetPagedFilteredAsync(page, pageSize, query, extension, category, cancellationToken);
        return Results.Ok(new PagedFilesResponse(items, page, pageSize, total));
    })
    .WithName("GetFiles");

api.MapGet("/files/{id:guid}", async (Guid id, FileIndexRepository repo, CancellationToken cancellationToken) =>
{
    var item = await repo.GetDtoByIdAsync(id, cancellationToken);
    return item is null ? Results.NotFound() : Results.Ok(item);
});

api.MapGet("/files/{id:guid}/download", async (
        Guid id,
        FileIndexRepository repo,
        FilePathResolver pathResolver,
        CancellationToken cancellationToken) =>
    {
        var entry = await repo.GetActiveByIdAsync(id, cancellationToken);

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

api.MapGet("/files/{id:guid}/stream", async (
        Guid id,
        FileIndexRepository repo,
        FilePathResolver pathResolver,
        HttpContext httpContext,
        CancellationToken cancellationToken) =>
    {
        var entry = await repo.GetActiveByIdAsync(id, cancellationToken);

        if (entry is null)
            return Results.NotFound();

        var absolutePath = pathResolver.ToAbsolutePath(entry.RelativePath);
        if (!File.Exists(absolutePath))
            return Results.NotFound();

        var fileLength = new FileInfo(absolutePath).Length;
        var rangeHeader = httpContext.Request.Headers.Range.ToString();

        if (!string.IsNullOrWhiteSpace(rangeHeader) && rangeHeader.StartsWith("bytes="))
        {
            var rangeParts = rangeHeader["bytes=".Length..].Split('-');
            var start = long.Parse(rangeParts[0]);
            var end = rangeParts.Length > 1 && long.TryParse(rangeParts[1], out var e) && e > 0
                ? Math.Min(e, fileLength - 1)
                : fileLength - 1;
            var chunkLength = end - start + 1;

            httpContext.Response.StatusCode = 206;
            httpContext.Response.Headers.ContentRange = $"bytes {start}-{end}/{fileLength}";
            httpContext.Response.Headers.AcceptRanges = "bytes";
            httpContext.Response.ContentType = entry.MimeType;
            httpContext.Response.ContentLength = chunkLength;

            await using var fs = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, true);
            fs.Seek(start, SeekOrigin.Begin);

            var buffer = new byte[64 * 1024];
            var remaining = chunkLength;
            while (remaining > 0)
            {
                var toRead = (int)Math.Min(buffer.Length, remaining);
                var read = await fs.ReadAsync(buffer.AsMemory(0, toRead), cancellationToken);
                if (read == 0) break;
                await httpContext.Response.Body.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                remaining -= read;
            }

            return Results.Empty;
        }

        httpContext.Response.Headers.AcceptRanges = "bytes";
        var fullStream = new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, true);
        return Results.File(fullStream, entry.MimeType, enableRangeProcessing: true);
    });

api.MapPost("/files/upload", async (
        IFormFile file,
        string? relativeDirectory,
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

        var allowedExtensions = storageOptions.Value.AllowedExtensions;
        if (allowedExtensions.Length > 0)
        {
            var uploadedExtension = Path.GetExtension(file.FileName).TrimStart('.').ToLowerInvariant();
            var isAllowed = allowedExtensions
                .Select(x => x.Trim().TrimStart('.').ToLowerInvariant())
                .Contains(uploadedExtension, StringComparer.OrdinalIgnoreCase);
            if (!isAllowed)
            {
                return Results.BadRequest("Uploaded file extension is not allowed.");
            }
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
        FileIndexRepository repo,
        FilePathResolver pathResolver,
        CancellationToken cancellationToken) =>
    {
        var entry = await repo.GetActiveByIdAsync(id, cancellationToken);
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
        await repo.SaveChangesAsync(cancellationToken);
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