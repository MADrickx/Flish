using System.Text;
using flish.Configuration;
using flish.Features.Auth;
using flish.Features.Indexing;
using flish.Features.Transcoding;
using flish.Infrastructure.Persistence;
using flish.Infrastructure.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection(StorageOptions.SectionName));
builder.Services.Configure<IndexingOptions>(builder.Configuration.GetSection(IndexingOptions.SectionName));
builder.Services.Configure<BasicAuthOptions>(builder.Configuration.GetSection(BasicAuthOptions.SectionName));
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
builder.Services.AddPooledDbContextFactory<FlishDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddScoped(sp => sp.GetRequiredService<IDbContextFactory<FlishDbContext>>().CreateDbContext());

builder.Services.Configure<FormOptions>(options =>
{
    var maxUploadBytes = builder.Configuration.GetValue<long>("Storage:MaxUploadBytes", 524_288_000);
    options.MultipartBodyLengthLimit = maxUploadBytes;
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();

var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
var jwtSecretKey = jwtSection.GetValue<string>("SecretKey")
    ?? throw new InvalidOperationException("Jwt:SecretKey is required.");
var jwtIssuer = jwtSection.GetValue<string>("Issuer") ?? "flish";
var jwtAudience = jwtSection.GetValue<string>("Audience") ?? "flish-client";

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("writes", limiter =>
    {
        limiter.PermitLimit = 20;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("auth", limiter =>
    {
        limiter.PermitLimit = 10;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("public-stream", limiter =>
    {
        limiter.PermitLimit = 60;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
});

builder.Services.AddSingleton<FilePathResolver>();
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<AuthUserSeeder>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<FileIndexRepository>();
builder.Services.AddSingleton<IFileIndexer, FileIndexer>();
builder.Services.AddSingleton<TranscodeService>();
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
app.MapControllers().RequireAuthorization();

app.Run();
