using System.Security.Claims;
using System.Text.Json;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Dashboard;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(IDbConnectionFactory db) : ControllerBase
{
    // ── GET /config ──────────────────────────────────────────────────────────
    [HttpGet("config")]
    public async Task<IActionResult> GetConfig()
    {
        await using var conn = db.Create();
        var json = await conn.QueryFirstOrDefaultAsync<string>(
            "SELECT config_json FROM dashboard_config WHERE id = 1");
        return Content(json ?? "{}", "application/json");
    }

    // ── PUT /config ──────────────────────────────────────────────────────────
    [HttpPut("config")]
    [Authorize(Roles = "encargado")]
    public async Task<IActionResult> SaveConfig([FromBody] JsonDocument body)
    {
        var user    = User.FindFirstValue(ClaimTypes.Name) ?? "encargado";
        var jsonStr = body.RootElement.GetRawText();

        await using var conn = db.Create();
        await conn.ExecuteAsync("""
            INSERT INTO dashboard_config (id, config_json, updated_by)
            VALUES (1, @json, @user)
            ON DUPLICATE KEY UPDATE config_json = @json, updated_by = @user, updated_at = NOW()
            """, new { json = jsonStr, user });

        return Ok(new { saved = true });
    }


    // ── GET /ultima-fecha ────────────────────────────────────────────────────
    // Devuelve la fecha más reciente con datos en las tablas principales
    [HttpGet("ultima-fecha")]
    public async Task<IActionResult> GetUltimaFecha()
    {
        await using var conn = db.Create();
        var fecha = await conn.QueryFirstOrDefaultAsync<string>("""
            SELECT DATE_FORMAT(GREATEST(
                COALESCE((SELECT MAX(fecha) FROM v_balance_hidrico),         '2020-01-01'),
                COALESCE((SELECT MAX(fecha) FROM v_consumo_quimico_diario),  '2020-01-01'),
                COALESCE((SELECT MAX(fecha) FROM medicion_calidad),          '2020-01-01')
            ), '%Y-%m-%d') AS ultima_fecha
            """);
        return Ok(new { fecha = fecha ?? DateTime.Today.ToString("yyyy-MM-dd") });
    }

    // ── GET /kpis ────────────────────────────────────────────────────────────
    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis(
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin)
    {
        var hoy = DateTime.Today.ToString("yyyy-MM-dd");
        var fi  = fecha_inicio ?? DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd");
        var ff  = fecha_fin    ?? hoy;
        var fi7 = DateTime.Today.AddDays(-7).ToString("yyyy-MM-dd");

        await using var conn = db.Create();

        var caudalRow = await conn.QueryFirstOrDefaultAsync("""
            SELECT COALESCE(SUM(envio_th), 0) AS total_m3,
                   COUNT(DISTINCT fecha)       AS dias_con_datos,
                   COUNT(*)                    AS n_lecturas
            FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
            """, new { fi, ff });

        var costoRow = await conn.QueryFirstOrDefaultAsync("""
            SELECT COALESCE(SUM(costo_dia), 0) AS costo_total,
                   COALESCE(SUM(kg_dia),    0) AS kg_total,
                   COUNT(DISTINCT fecha)        AS n_registros
            FROM v_consumo_quimico_diario WHERE fecha BETWEEN @fi AND @ff
            """, new { fi, ff });

        var quimicosRows = await conn.QueryAsync("""
            SELECT producto_nombre AS nombre_quimico, 'KG' AS unidad,
                   ROUND(SUM(kg_dia), 2)  AS kg_total,
                   ROUND(SUM(costo_dia))  AS costo_total
            FROM v_consumo_quimico_diario WHERE fecha BETWEEN @fi AND @ff
            GROUP BY producto_id, producto_nombre
            HAVING SUM(costo_dia) > 0
            ORDER BY SUM(costo_dia) DESC LIMIT 5
            """, new { fi, ff });

        var calidadRow = await conn.QueryFirstOrDefaultAsync("""
            SELECT COALESCE(SUM(n_mediciones), 0) AS n_total
            FROM v_calidad_estadisticas
            WHERE (anio * 100 + mes)
                  BETWEEN (YEAR(@fi) * 100 + MONTH(@fi))
                  AND     (YEAR(@ff) * 100 + MONTH(@ff))
            """, new { fi, ff });

        var porTipoRows = await conn.QueryAsync("""
            SELECT 'GEM' AS tipo_agua, ROUND(COALESCE(SUM(consumo_gem_m3),0),1) AS m3_total
            FROM v_balance_hidrico WHERE fecha BETWEEN @fi7 AND @ff
            UNION ALL
            SELECT 'RO', ROUND(COALESCE(SUM(entrada_ro1),0),1)
            FROM v_balance_hidrico WHERE fecha BETWEEN @fi7 AND @ff
            """, new { fi7, ff });

        double totalM3 = Convert.ToDouble(((IDictionary<string, object>)caudalRow!)["total_m3"]);
        int dias = Math.Max(1, Convert.ToInt32(((IDictionary<string, object>)caudalRow)["dias_con_datos"]));

        return Ok(new
        {
            periodo = new { inicio = fi, fin = ff },
            caudal = new
            {
                total_m3             = totalM3,
                promedio_diario_m3   = dias > 0 ? Math.Round(totalM3 / dias, 1) : 0,
                dias_con_datos       = dias,
                n_lecturas           = Convert.ToInt32(((IDictionary<string, object>)caudalRow)["n_lecturas"]),
            },
            reactivos = new
            {
                costo_total  = Convert.ToDouble(((IDictionary<string, object>)costoRow!)["costo_total"]),
                kg_total     = Convert.ToDouble(((IDictionary<string, object>)costoRow)["kg_total"]),
                n_registros  = Convert.ToInt32(((IDictionary<string, object>)costoRow)["n_registros"]),
                por_quimico  = quimicosRows,
            },
            calidad = new
            {
                n_total = Convert.ToInt32(((IDictionary<string, object>)calidadRow!)["n_total"]),
            },
            caudal_por_tipo = porTipoRows,
        });
    }
}
