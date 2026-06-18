using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;
using PtarApi.Services;

namespace PtarApi.Features.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController(
    IDbConnectionFactory db,
    JwtService jwt,
    IWebHostEnvironment env,
    ILogger<AuthController> logger) : ControllerBase
{
    const int MaxFailedAttempts = 5;
    static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

    static string HashToken(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLower();

    static string GenerateRefreshToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    void SetAccessCookie(string token) =>
        Response.Cookies.Append("ptar_access_token", token, new CookieOptions
        {
            HttpOnly = true,
            Secure   = env.IsProduction(),
            SameSite = env.IsProduction() ? SameSiteMode.Strict : SameSiteMode.Lax,
            MaxAge   = TimeSpan.FromHours(8),
            Path     = "/",
        });

    void SetRefreshCookie(string raw) =>
        Response.Cookies.Append("ptar_refresh_token", raw, new CookieOptions
        {
            HttpOnly = true,
            Secure   = env.IsProduction(),
            SameSite = env.IsProduction() ? SameSiteMode.Strict : SameSiteMode.Lax,
            MaxAge   = TimeSpan.FromDays(7),
            Path     = "/api/auth",
        });

    // ── POST /api/auth/login ─────────────────────────────────────────────────
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        static IActionResult Invalid() =>
            new UnauthorizedObjectResult(new { detail = "Credenciales inválidas" });

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "-";

        await using var conn = db.Create();
        var row = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, email, nombre, role, password_hash, failed_attempts, locked_until, activo FROM ptar_users WHERE email = @Email",
            new { body.Email });

        if (row is null)
        {
            logger.LogWarning("[AUTH FAIL] Email not found: {Email} ip={IP}", body.Email, ip);
            return Invalid();
        }

        if (Convert.ToBoolean(row.activo ?? 1) == false)
        {
            logger.LogWarning("[AUTH FAIL] Account disabled: {Email} ip={IP}", body.Email, ip);
            return Unauthorized(new { detail = "Cuenta deshabilitada. Contacta al administrador." });
        }

        // Check lockout
        DateTime? lockedUntil = row.locked_until is not DBNull ? (DateTime?)Convert.ToDateTime(row.locked_until) : null;
        if (lockedUntil.HasValue && lockedUntil.Value > DateTime.UtcNow)
        {
            var remaining = (int)Math.Ceiling((lockedUntil.Value - DateTime.UtcNow).TotalMinutes);
            logger.LogWarning("[AUTH LOCK] Account locked: {Email} ip={IP} unlock_in={Min}min", body.Email, ip, remaining);
            return Unauthorized(new { detail = $"Cuenta bloqueada. Intenta en {remaining} minuto(s)." });
        }

        string? storedHash = row.password_hash;
        if (string.IsNullOrEmpty(storedHash))
        {
            logger.LogWarning("[AUTH FAIL] No password hash: {Email} ip={IP}", body.Email, ip);
            return Invalid();
        }

        bool valid;
        try { valid = BCrypt.Net.BCrypt.Verify(body.Password, storedHash); }
        catch { return Invalid(); }

        if (!valid)
        {
            int attempts = Convert.ToInt32(row.failed_attempts ?? 0) + 1;
            if (attempts >= MaxFailedAttempts)
            {
                await conn.ExecuteAsync(
                    "UPDATE ptar_users SET failed_attempts = @Att, locked_until = @Until WHERE id = @Id",
                    new { Att = attempts, Until = DateTime.UtcNow.Add(LockoutDuration), Id = row.id.ToString() });
                logger.LogWarning("[AUTH LOCK] Account locked after {N} attempts: {Email} ip={IP}", attempts, body.Email, ip);
                return Unauthorized(new { detail = $"Demasiados intentos fallidos. Cuenta bloqueada por {(int)LockoutDuration.TotalMinutes} minutos." });
            }
            await conn.ExecuteAsync(
                "UPDATE ptar_users SET failed_attempts = @Att WHERE id = @Id",
                new { Att = attempts, Id = row.id.ToString() });
            logger.LogWarning("[AUTH FAIL] Invalid password: {Email} attempt={N} ip={IP}", body.Email, attempts, ip);
            return Invalid();
        }

        // Reset lockout counters on success
        await conn.ExecuteAsync(
            "UPDATE ptar_users SET failed_attempts = 0, locked_until = NULL WHERE id = @Id",
            new { Id = row.id.ToString() });

        var userId = row.id?.ToString() ?? "";
        var role   = (string)row.role;
        var token  = jwt.CreateToken(userId, role);

        // Issue refresh token
        var rawRefresh    = GenerateRefreshToken();
        var refreshHash   = HashToken(rawRefresh);
        var refreshExpiry = DateTime.UtcNow.AddDays(7);
        await conn.ExecuteAsync(
            "INSERT INTO ptar_refresh_tokens (user_id, token_hash, expires_at) VALUES (@UserId, @Hash, @Exp)",
            new { UserId = userId, Hash = refreshHash, Exp = refreshExpiry });

        SetAccessCookie(token);
        SetRefreshCookie(rawRefresh);

        logger.LogInformation("Login exitoso: {Email} [{Role}]", body.Email, role);

        return Ok(new LoginResponse(
            Id:     userId,
            Email:  (string)row.email,
            Nombre: (string)row.nombre,
            Role:   role));
    }

    // ── POST /api/auth/refresh ───────────────────────────────────────────────
    [HttpPost("refresh")]
    [ProducesResponseType(200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Refresh()
    {
        var rawToken = Request.Cookies["ptar_refresh_token"];
        if (string.IsNullOrEmpty(rawToken))
            return Unauthorized(new { detail = "Sin refresh token" });

        var hash = HashToken(rawToken);
        await using var conn = db.Create();

        var rt = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, user_id, expires_at, revoked FROM ptar_refresh_tokens WHERE token_hash = @Hash",
            new { Hash = hash });

        if (rt is null || Convert.ToBoolean(rt.revoked) || Convert.ToDateTime(rt.expires_at) < DateTime.UtcNow)
        {
            Response.Cookies.Delete("ptar_refresh_token", new CookieOptions { Path = "/api/auth" });
            return Unauthorized(new { detail = "Refresh token inválido o expirado" });
        }

        string userId = (string)rt.user_id;
        var user      = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, email, nombre, role FROM ptar_users WHERE id = @Id",
            new { Id = userId });

        if (user is null) return Unauthorized();

        string userRole = (string)user.role;

        // Rotate: revoke old, issue new
        var newRaw    = GenerateRefreshToken();
        var newHash   = HashToken(newRaw);
        var newExpiry = DateTime.UtcNow.AddDays(7);

        await conn.ExecuteAsync(
            "UPDATE ptar_refresh_tokens SET revoked = 1 WHERE id = @Id",
            new { Id = Convert.ToInt32(rt.id) });
        await conn.ExecuteAsync(
            "INSERT INTO ptar_refresh_tokens (user_id, token_hash, expires_at) VALUES (@UserId, @Hash, @Exp)",
            new { UserId = userId, Hash = newHash, Exp = newExpiry });

        SetAccessCookie(jwt.CreateToken(userId, userRole));
        SetRefreshCookie(newRaw);

        logger.LogInformation("[REFRESH] Token renovado: userId={UserId}", userId);
        return Ok(new { refreshed = true });
    }

    // ── POST /api/auth/logout ────────────────────────────────────────────────
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var rawToken = Request.Cookies["ptar_refresh_token"];
        if (!string.IsNullOrEmpty(rawToken))
        {
            var hash = HashToken(rawToken);
            await using var conn = db.Create();
            await conn.ExecuteAsync(
                "UPDATE ptar_refresh_tokens SET revoked = 1 WHERE token_hash = @Hash",
                new { Hash = hash });
        }

        Response.Cookies.Delete("ptar_access_token");
        Response.Cookies.Delete("ptar_refresh_token", new CookieOptions { Path = "/api/auth" });
        return NoContent();
    }

    // ── GET /api/auth/me ─────────────────────────────────────────────────────
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(MeResponse), 200)]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;

        if (userId is null) return Unauthorized();

        await using var conn = db.Create();
        var row = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, email, nombre, role FROM ptar_users WHERE id = @Id",
            new { Id = userId });

        if (row is null) return Unauthorized();

        return Ok(new MeResponse(
            Id:     row.id?.ToString() ?? "",
            Email:  (string)row.email,
            Nombre: (string)row.nombre,
            Role:   (string)row.role));
    }

    // ── POST /api/auth/change-password ───────────────────────────────────────
    [HttpPost("change-password")]
    [Authorize]
    [ProducesResponseType(204)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest body)
    {
        if (body.NewPassword.Length < 8)
            return BadRequest(new { detail = "La nueva contraseña debe tener al menos 8 caracteres" });

        if (!body.NewPassword.Any(char.IsUpper) ||
            !body.NewPassword.Any(char.IsDigit) ||
            !body.NewPassword.Any(c => !char.IsLetterOrDigit(c)))
            return BadRequest(new { detail = "La nueva contraseña debe incluir mayúsculas, números y un carácter especial (ej: !@#$%)" });

        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;
        if (userId is null) return Unauthorized();

        await using var conn = db.Create();
        var row = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, password_hash FROM ptar_users WHERE id = @Id",
            new { Id = userId });

        if (row is null) return Unauthorized();

        string? storedHash = row.password_hash;
        bool valid;
        try { valid = !string.IsNullOrEmpty(storedHash) && BCrypt.Net.BCrypt.Verify(body.CurrentPassword, storedHash); }
        catch { valid = false; }

        if (!valid)
        {
            logger.LogWarning("[CHGPWD] Verificacion fallida userId={UserId} hashNull={HashNull}", userId, storedHash is null);
            return BadRequest(new { detail = "La contraseña actual es incorrecta" });
        }

        var newHash = BCrypt.Net.BCrypt.HashPassword(body.NewPassword, workFactor: 12);
        await conn.ExecuteAsync(
            "UPDATE ptar_users SET password_hash = @Hash WHERE id = @Id",
            new { Hash = newHash, Id = userId });

        // Revocar todos los refresh tokens del usuario (fuerza re-login en otros dispositivos)
        await conn.ExecuteAsync(
            "UPDATE ptar_refresh_tokens SET revoked = 1 WHERE user_id = @UserId",
            new { UserId = userId });

        logger.LogInformation("[AUTH] Password changed for userId={UserId}", userId);
        return NoContent();
    }
}
