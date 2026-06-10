using System.Text;
using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PtarApi.Data;
using PtarApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Logging ──────────────────────────────────────────────────────────────────
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// ── Base de datos MySQL (Pomelo) ──────────────────────────────────────────────
var connStr = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("ConnectionStrings:Default no configurado");

builder.Services.AddDbContext<PtarDbContext>(opt =>
    opt.UseMySql(connStr, ServerVersion.AutoDetect(connStr),
        mysql => mysql.EnableRetryOnFailure(3)));

// Fábrica de conexiones ligeras para Dapper (raw SQL)
builder.Services.AddScoped<IDbConnectionFactory>(_ => new MySqlConnectionFactory(connStr));

// ── JWT ───────────────────────────────────────────────────────────────────────
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSecret  = jwtSection["Secret"] ?? throw new InvalidOperationException("Jwt:Secret no configurado");
var jwtIssuer  = jwtSection["Issuer"] ?? "ptar-api";
var jwtAudience = jwtSection["Audience"] ?? "ptar-app";

builder.Services.AddSingleton<JwtService>(sp =>
    new JwtService(jwtSecret, jwtIssuer, jwtAudience,
        int.TryParse(jwtSection["ExpiryHours"], out var h) ? h : 24));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = jwtIssuer,
            ValidAudience            = jwtAudience,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddAuthorization();

// ── CORS ──────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5174"];

builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(
    builder.Configuration.GetSection("RateLimiting"));
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// ── SharePoint sync ───────────────────────────────────────────────────────────
builder.Services.AddSingleton<SharePointService>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>().GetSection("SharePoint");
    return new SharePointService(
        siteUrl:        cfg["SiteUrl"] ?? "https://permodaco.sharepoint.com/sites/CONFIABILIDAD",
        tokenCacheFile: cfg["TokenCacheFile"] ?? "../.sharepoint_token_cache.json",
        logger:         sp.GetRequiredService<ILogger<SharePointService>>());
});
builder.Services.AddHostedService<SharePointSyncService>();

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.PropertyNamingPolicy = null; // snake_case lo maneja cada modelo
        opt.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new() { Title = "PTAR API", Version = "v1" }));

// ── QuestPDF licencia community ───────────────────────────────────────────────
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// ═════════════════════════════════════════════════════════════════════════════
var app = builder.Build();
// ═════════════════════════════════════════════════════════════════════════════

app.UseCors();
app.UseIpRateLimiting();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
