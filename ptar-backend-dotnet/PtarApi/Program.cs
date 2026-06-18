using System.Text;
using AspNetCoreRateLimit;
using Dapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PtarApi.Data;
using PtarApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Sobreescrituras locales — nunca commiteadas (ver .gitignore)
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// ── Request body size limit ───────────────────────────────────────────────────
builder.WebHost.ConfigureKestrel(opt =>
    opt.Limits.MaxRequestBodySize = 1 * 1024 * 1024); // 1 MB

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
        // Acepta JWT desde cookie httpOnly además del header Authorization
        opt.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token))
                    ctx.Token = ctx.Request.Cookies["ptar_access_token"];
                return Task.CompletedTask;
            }
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
        .WithHeaders("Authorization", "Content-Type", "X-ClientId", "X-Real-IP")
        .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
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
builder.Services.AddHostedService<TokenCleanupService>();

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

// ── DB Migrations (idempotentes) ──────────────────────────────────────────────
{
    using var scope  = app.Services.CreateScope();
    var migDb        = scope.ServiceProvider.GetRequiredService<IDbConnectionFactory>();
    await using var conn = migDb.Create();
    var migLog       = app.Logger;

    var hasLockout = await conn.QueryFirstOrDefaultAsync<string>(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ptar_users' AND COLUMN_NAME = 'failed_attempts'");
    if (hasLockout is null)
    {
        await conn.ExecuteAsync(
            "ALTER TABLE ptar_users ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0, ADD COLUMN locked_until DATETIME NULL");
        migLog.LogInformation("[MIGRATE] Added lockout columns to ptar_users");
    }

    var hasActivo = await conn.QueryFirstOrDefaultAsync<string>(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ptar_users' AND COLUMN_NAME = 'activo'");
    if (hasActivo is null)
    {
        await conn.ExecuteAsync(
            "ALTER TABLE ptar_users ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1");
        migLog.LogInformation("[MIGRATE] Added activo column to ptar_users");
    }

    await conn.ExecuteAsync("""
        CREATE TABLE IF NOT EXISTS ptar_refresh_tokens (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    CHAR(36) NOT NULL,
            token_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT NOW(),
            revoked    TINYINT(1) NOT NULL DEFAULT 0,
            INDEX      idx_token_hash (token_hash),
            INDEX      idx_user_id (user_id)
        )
        """);
    migLog.LogInformation("[MIGRATE] ptar_refresh_tokens OK");
}

if (app.Environment.IsProduction()) app.UseHttpsRedirection();

app.UseCors();
app.UseIpRateLimiting();

// ── Security headers ──────────────────────────────────────────────────────────
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Frame-Options"]           = "DENY";
    ctx.Response.Headers["X-Content-Type-Options"]    = "nosniff";
    ctx.Response.Headers["Referrer-Policy"]           = "strict-origin-when-cross-origin";
    ctx.Response.Headers["X-XSS-Protection"]          = "1; mode=block";
    ctx.Response.Headers["Permissions-Policy"]        = "camera=(), microphone=(), geolocation=()";
    ctx.Response.Headers["Content-Security-Policy"]   = "default-src 'none'; frame-ancestors 'none'";
    await next();
});

if (app.Environment.IsProduction()) app.UseHsts();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();

// ── Audit log — registra operaciones de escritura con identidad del usuario ────
app.Use(async (ctx, next) =>
{
    await next();
    var method = ctx.Request.Method;
    if (method is "POST" or "PUT" or "DELETE" or "PATCH")
    {
        var userId = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? ctx.User.FindFirst("sub")?.Value
                  ?? "anon";
        var role   = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "-";
        var logger = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogInformation("[AUDIT] {Method} {Path} status={Status} user={UserId} role={Role} ip={IP}",
            method, ctx.Request.Path, ctx.Response.StatusCode, userId, role,
            ctx.Connection.RemoteIpAddress);
    }
});

app.MapControllers();

// Health check
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

app.Run();
