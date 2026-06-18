using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Equipos;

[ApiController]
[Route("api/equipos")]
[Authorize]
public class EquiposController(IDbConnectionFactory db) : ControllerBase
{
    // ── GET /estados-hoy ─────────────────────────────────────────────────────
    [HttpGet("estados-hoy")]
    public async Task<IActionResult> GetEstadosHoy()
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT e.equipo_key, e.estado, e.observacion
            FROM estado_equipo e
            INNER JOIN (
                SELECT equipo_key, MAX(fecha * 10 + turno) AS max_ft
                FROM estado_equipo
                GROUP BY equipo_key
            ) latest ON e.equipo_key = latest.equipo_key
                     AND (e.fecha * 10 + e.turno) = latest.max_ft
            ORDER BY e.equipo_key
            """);
        return Ok(rows);
    }

    // ── POST /estados ────────────────────────────────────────────────────────
    [HttpPost("estados")]
    public async Task<IActionResult> UpsertEstado([FromBody] UpsertEstadoIn body)
    {
        await using var conn = db.Create();
        await conn.ExecuteAsync("""
            INSERT INTO estado_equipo (fecha, turno, equipo_key, estado, observacion, usuario)
            VALUES (@fecha, @turno, @key, @estado, @obs, @usr)
            ON DUPLICATE KEY UPDATE
                estado      = VALUES(estado),
                observacion = VALUES(observacion),
                usuario     = VALUES(usuario),
                created_at  = CURRENT_TIMESTAMP
            """, new
        {
            fecha  = DateTime.Today.ToString("yyyy-MM-dd"),
            turno  = body.turno,
            key    = body.equipo_key,
            estado = body.estado,
            obs    = body.observacion,
            usr    = body.usuario,
        });
        return Ok(new { ok = true });
    }
}

public record UpsertEstadoIn(
    string equipo_key,
    string estado,
    int turno,
    string? observacion,
    string? usuario);
