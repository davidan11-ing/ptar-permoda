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
    ILogger<AuthController> logger) : ControllerBase
{
    // ── POST /api/auth/login ─────────────────────────────────────────────────
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        // Respuesta genérica — no revelar si existe o no el email
        static IActionResult Invalid() =>
            new UnauthorizedObjectResult(new { detail = "Credenciales inválidas" });

        await using var conn = db.Create();
        var row = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, email, nombre, role, password_hash FROM ptar_users WHERE email = @Email",
            new { body.Email });

        if (row is null) return Invalid();

        string? storedHash = row.password_hash;
        if (string.IsNullOrEmpty(storedHash)) return Invalid();

        bool valid;
        try { valid = BCrypt.Net.BCrypt.Verify(body.Password, storedHash); }
        catch { return Invalid(); }

        if (!valid) return Invalid();

        var userId = row.id?.ToString() ?? "";
        var role   = (string)row.role;
        var token  = jwt.CreateToken(userId, role);

        logger.LogInformation("Login exitoso: {Email} [{Role}]", body.Email, role);

        return Ok(new LoginResponse(
            Id:          userId,
            Email:       (string)row.email,
            Nombre:      (string)row.nombre,
            Role:        role,
            AccessToken: token));
    }

    // ── GET /api/auth/me ────────────────────────────────────────────────────
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(MeResponse), 200)]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
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
}
