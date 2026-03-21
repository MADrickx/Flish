---
name: create-dotnet-feature
description: Scaffold a new backend feature slice in the Flish .NET API — entity, DTO, configuration, endpoint group, and optional background service. Use when the user asks to add a new backend feature, API endpoint group, or domain area to the ASP.NET Core API.
---

# Create .NET Feature (Flish Backend)

Scaffolds a vertical feature slice in `back-end/flish/flish/`.

## Workflow

1. **Determine the feature name** from the user's request (e.g. `Playlists`, `Transcoding`, `Thumbnails`).
2. **Create the folder structure**:

```
back-end/flish/flish/
├── Features/<FeatureName>/
│   ├── <FeatureName>Service.cs          # Business logic
│   └── I<FeatureName>Service.cs         # Interface (if needed)
├── Contracts/<FeatureName>/
│   └── <FeatureName>Response.cs         # DTOs
├── Configuration/
│   └── <FeatureName>Options.cs          # IOptions<T> config (if needed)
└── Infrastructure/Persistence/Entities/
    └── <EntityName>.cs                  # EF Core entity (if needed)
```

3. **Register services** in `Program.cs`.
4. **Add endpoints** in `Program.cs` within the `api` route group.
5. **Add DbSet** to `FlishDbContext` and configure in `OnModelCreating` if a new entity is created.

## Template: Entity

```csharp
namespace flish.Infrastructure.Persistence.Entities;

public class <EntityName>
{
    public Guid Id { get; set; }
    // domain fields
    public DateTime CreatedUtc { get; set; }
    public DateTime UpdatedUtc { get; set; }
}
```

Register in `FlishDbContext`:

```csharp
public DbSet<<EntityName>> <EntityName>s => Set<<EntityName>>();
```

Configure in `OnModelCreating`:

```csharp
modelBuilder.Entity<<EntityName>>(entity =>
{
    entity.ToTable("<table_name>");
    entity.HasKey(x => x.Id);
    // indexes, constraints, property config
});
```

## Template: DTO Record

```csharp
namespace flish.Contracts.<FeatureName>;

public sealed record <FeatureName>ItemDto(
    Guid Id,
    // fields matching API response shape
    DateTime CreatedUtc
);

public sealed record Paged<FeatureName>Response(
    IReadOnlyList<<FeatureName>ItemDto> Items,
    int Page,
    int PageSize,
    int Total
);
```

## Template: Configuration Options

```csharp
namespace flish.Configuration;

public sealed class <FeatureName>Options
{
    public const string SectionName = "<FeatureName>";

    public int SomeLimit { get; set; } = 100;
    public bool Enabled { get; set; } = true;
}
```

Register in `Program.cs`:

```csharp
builder.Services.Configure<<FeatureName>Options>(
    builder.Configuration.GetSection(<FeatureName>Options.SectionName));
```

## Template: Feature Service

```csharp
namespace flish.Features.<FeatureName>;

public interface I<FeatureName>Service
{
    Task<List<<EntityName>>> GetAllAsync(CancellationToken ct);
}

public sealed class <FeatureName>Service(
    FlishDbContext dbContext,
    ILogger<<FeatureName>Service> logger
) : I<FeatureName>Service
{
    private readonly FlishDbContext _dbContext = dbContext;
    private readonly ILogger<<FeatureName>Service> _logger = logger;

    public async Task<List<<EntityName>>> GetAllAsync(CancellationToken ct)
    {
        return await _dbContext.<EntityName>s
            .AsNoTracking()
            .OrderBy(x => x.CreatedUtc)
            .ToListAsync(ct);
    }
}
```

For singleton services that need DB access, inject `IDbContextFactory<FlishDbContext>` instead of `FlishDbContext`.

## Template: Minimal API Endpoints

Add to the `api` route group in `Program.cs`:

```csharp
api.MapGet("/<feature-name>", async (
        I<FeatureName>Service service,
        int page,
        int pageSize,
        CancellationToken ct) =>
    {
        // paginate, map to DTOs, return
    })
    .WithName("Get<FeatureName>");

api.MapGet("/<feature-name>/{id:guid}", async (
        Guid id,
        I<FeatureName>Service service,
        CancellationToken ct) =>
    {
        // get by id, return DTO or NotFound
    });

api.MapPost("/<feature-name>", async (
        <CreateRequest> request,
        I<FeatureName>Service service,
        CancellationToken ct) =>
    {
        // create, return Created
    })
    .RequireRateLimiting("writes");

api.MapDelete("/<feature-name>/{id:guid}", async (
        Guid id,
        I<FeatureName>Service service,
        CancellationToken ct) =>
    {
        // delete, return NoContent
    })
    .RequireRateLimiting("writes");
```

## Template: Background Service

For features that need periodic processing:

```csharp
namespace flish.Features.<FeatureName>;

public sealed class <FeatureName>BackgroundService(
    I<FeatureName>Service service,
    IOptions<<FeatureName>Options> options,
    ILogger<<FeatureName>BackgroundService> logger
) : BackgroundService
{
    private readonly I<FeatureName>Service _service = service;
    private readonly <FeatureName>Options _options = options.Value;
    private readonly ILogger<<FeatureName>BackgroundService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromSeconds(_options.IntervalSeconds);
        using var timer = new PeriodicTimer(interval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                // periodic work
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "<FeatureName> background task failed.");
            }
        }
    }
}
```

Register in `Program.cs`:

```csharp
builder.Services.AddScoped<I<FeatureName>Service, <FeatureName>Service>();
builder.Services.AddHostedService<<FeatureName>BackgroundService>();
```

## Rules

- **Always** use primary constructor injection for services
- **Always** use `CancellationToken` in async methods
- **Always** use `AsNoTracking()` for read-only queries
- **Always** use `IDbContextFactory<FlishDbContext>` for singleton services
- **Always** place mutation endpoints behind `.RequireRateLimiting("writes")`
- **Always** add new entities to `FlishDbContext.OnModelCreating`
- **Use** `IOptions<T>` for feature-specific configuration
- **Use** `sealed record` for DTOs
- **Use** `sealed class` for services and background services
- **Keep** endpoints in `Program.cs` (minimal API pattern)
- **Keep** business logic in feature services, not in endpoint lambdas
