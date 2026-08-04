using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;
using PtarApi.Services;

namespace PtarApi.Features.Mantenimientos;

[ApiController]
[Route("api/mantenimientos")]
[Authorize]
public class MantenimientosController(
    IDbConnectionFactory db,
    SharePointService sharePoint,
    IConfiguration config,
    ILogger<MantenimientosController> logger) : ControllerBase
{
    // Mapeo area_code → cláusula SQL (igual que Python)
    private static readonly Dictionary<string, string> AreaCodeSql = new()
    {
        { "PTAR_PT", "UPPER(gft) IN ('PTAR BOG', 'PTAR')" },
    };

    // ── GET / — listado con filtros ──────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetMantenimientos(
        [FromQuery] int?    semana      = null,
        [FromQuery] string? estado      = null,
        [FromQuery] string? area        = null,
        [FromQuery] string? area_code   = null,
        [FromQuery] string? responsable = null,
        [FromQuery] string? criticidad  = null,
        [FromQuery] string? tipo        = null,
        [FromQuery] int     limit       = 1000)
    {
        var filters = new List<string>();
        var p = new DynamicParameters(); p.Add("limit", Math.Clamp(limit, 1, 5000));

        if (semana.HasValue) { filters.Add("semana = @semana"); p.Add("semana", semana.Value); }
        if (estado != null)  { filters.Add("UPPER(estado) LIKE UPPER(@estado)"); p.Add("estado", $"%{estado}%"); }
        if (area != null)    { filters.Add("UPPER(area) LIKE UPPER(@area)"); p.Add("area", $"%{area}%"); }
        if (area_code != null && AreaCodeSql.TryGetValue(area_code.ToUpper(), out var areaClause))
            filters.Add(areaClause);
        if (responsable != null) { filters.Add("responsable LIKE @resp"); p.Add("resp", $"%{responsable}%"); }
        if (criticidad != null)  { filters.Add("UPPER(criticidad) = UPPER(@crit)"); p.Add("crit", criticidad); }
        if (tipo != null)        { filters.Add("UPPER(tipo_mantenimiento) LIKE UPPER(@tipo)"); p.Add("tipo", $"%{tipo}%"); }

        var where = filters.Count > 0 ? "WHERE " + string.Join(" AND ", filters) : "";

        await using var conn = db.Create();
        var rows = await conn.QueryAsync($"""
            SELECT id, sharepoint_id, semana, gerencia, area, gft,
                   objeto, af, descripcion, tipo_mantenimiento, frecuencia,
                   responsable, pedido_de_trabajo, criticidad, estado,
                   DATE_FORMAT(dia_programado,'%Y-%m-%d') AS dia_programado,
                   asignado_a, observaciones,
                   DATE_FORMAT(ultima_sync,'%Y-%m-%d %H:%i') AS ultima_sync
            FROM mantenimientos_preventivos {where}
            ORDER BY semana DESC,
                     FIELD(UPPER(criticidad),'ALTA','MEDIA','BAJA') ASC,
                     dia_programado ASC
            LIMIT @limit
            """, p);
        return Ok(rows);
    }

    // ── GET /kpis ────────────────────────────────────────────────────────────
    [HttpGet("kpis")]
    public async Task<IActionResult> GetKpis(
        [FromQuery] int?    semana    = null,
        [FromQuery] string? area_code = null)
    {
        var filters = new List<string>();
        var p = new DynamicParameters();

        if (semana.HasValue) { filters.Add("semana = @semana"); p.Add("semana", semana.Value); }
        if (area_code != null && AreaCodeSql.TryGetValue(area_code.ToUpper(), out var areaClause))
            filters.Add(areaClause);

        var where = filters.Count > 0 ? "WHERE " + string.Join(" AND ", filters) : "";

        await using var conn = db.Create();
        var row = await conn.QueryFirstOrDefaultAsync($"""
            SELECT COUNT(*)                                              AS total,
                   SUM(UPPER(estado) LIKE '%COMPLET%')                  AS completados,
                   SUM(UPPER(estado) LIKE '%PENDIENTE%')                AS pendientes,
                   SUM(UPPER(estado) LIKE '%PROCESO%'
                    OR UPPER(estado) LIKE '%PROGRESO%')                 AS en_proceso,
                   SUM(UPPER(estado) LIKE '%APROBAC%')                  AS por_aprobacion,
                   SUM(UPPER(criticidad) = 'ALTA')                      AS criticos,
                   MAX(ultima_sync)                                      AS ultima_actualizacion
            FROM mantenimientos_preventivos {where}
            """, p);

        // por_criticidad — subquery para evitar only_full_group_by con FIELD()
        var critRows = await conn.QueryAsync($"""
            SELECT * FROM (
                SELECT COALESCE(UPPER(criticidad), 'SIN DEFINIR') AS criticidad,
                       COUNT(*)                                    AS n,
                       SUM(UPPER(estado) LIKE '%COMPLET%')         AS completados,
                       SUM(UPPER(estado) LIKE '%APROBAC%')         AS por_aprobacion,
                       SUM(UPPER(estado) LIKE '%PENDIENTE%')       AS pendientes
                FROM mantenimientos_preventivos {where}
                GROUP BY COALESCE(UPPER(criticidad), 'SIN DEFINIR')
            ) AS t
            ORDER BY FIELD(criticidad,'ALTA','MEDIA','BAJA','SIN DEFINIR') ASC
            """, p);

        var d = (IDictionary<string, object>)row!;
        return Ok(new
        {
            total                = Convert.ToInt32(d["total"]),
            completados          = Convert.ToInt32(d["completados"]),
            pendientes           = Convert.ToInt32(d["pendientes"]),
            en_proceso           = Convert.ToInt32(d["en_proceso"]),
            por_aprobacion       = Convert.ToInt32(d["por_aprobacion"]),
            criticos             = Convert.ToInt32(d["criticos"]),
            ultima_actualizacion = d["ultima_actualizacion"]?.ToString() ?? "",
            por_criticidad       = critRows,
        });
    }

    // ── POST /pull — sync manual desde SharePoint ────────────────────────────
    [HttpPost("pull")]
    public async Task<IActionResult> PullFromSharePoint()
    {
        var cacheFile = config["SharePoint:TokenCacheFile"] ?? "../.sharepoint_token_cache.json";
        if (!System.IO.File.Exists(Path.GetFullPath(cacheFile)))
            return StatusCode(503, new { detail = "SharePoint no configurado. Corre auth_sharepoint.py" });

        try
        {
            var inicio = DateTime.Now;
            logger.LogInformation("Pull manual SharePoint...");

            var items = await sharePoint.FetchItemsAsync();

            // UPSERT
            const string sql = """
                INSERT INTO mantenimientos_preventivos
                  (sharepoint_id, semana, area, gft, objeto, af, descripcion,
                   frecuencia, responsable, pedido_de_trabajo, criticidad,
                   estado, dia_programado, asignado_a, observaciones)
                VALUES
                  (@SpId, @Semana, @Area, @Gft, @Objeto, @Af, @Descripcion,
                   @Frecuencia, @Responsable, @Pedido, @Criticidad,
                   @Estado, @Dia, @Asignado, @Observaciones)
                ON DUPLICATE KEY UPDATE
                  semana            = @Semana, area          = @Area,
                  gft               = @Gft,   objeto         = @Objeto,
                  af                = @Af,    descripcion    = @Descripcion,
                  frecuencia        = @Frecuencia,
                  responsable       = @Responsable,
                  pedido_de_trabajo = @Pedido, criticidad    = @Criticidad,
                  estado            = @Estado, dia_programado = @Dia,
                  asignado_a        = @Asignado, observaciones = @Observaciones
                """;

            await using var conn = db.Create();
            await conn.ExecuteAsync(sql, items);

            var duracion = (DateTime.Now - inicio).TotalSeconds;
            logger.LogInformation("Pull completado: {N} registros en {D:F1}s", items.Count, duracion);

            return Ok(new
            {
                ok         = true,
                procesados = items.Count,
                duracion_s = Math.Round(duracion, 1),
                timestamp  = DateTime.Now.ToString("s"),
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error en pull SharePoint");
            return StatusCode(500, new { detail = $"Error SharePoint: {ex.Message}" });
        }
    }
}
