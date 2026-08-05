using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Turno;

[ApiController]
[Route("api/turno")]
[Authorize]
public class TurnoController(IDbConnectionFactory db) : ControllerBase
{
    // Calcula turno_int (1=Noche 22-06, 2=Mañana 06-14, 3=Tarde 14-22) en hora Colombia (UTC-5)
    private static int GetTurnoInt()
    {
        var hora = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "SA Pacific Standard Time").Hour;
        return hora < 6 ? 1 : hora < 14 ? 2 : hora < 22 ? 3 : 1;
    }

    private static string GetTurnoNombre(int t) => t switch { 2 => "Mañana", 3 => "Tarde", _ => "Noche" };

    // Número de semana ISO del día actual
    private static int GetSemanaActual()
    {
        var now = DateTime.UtcNow.Date;
        var day = (int)now.DayOfWeek; if (day == 0) day = 7;
        var thu = now.AddDays(4 - day);
        return (int)Math.Ceiling(((thu - new DateTime(thu.Year, 1, 1)).TotalDays + 1) / 7);
    }

    // GET /api/turno/resumen
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen()
    {
        var turnoInt    = GetTurnoInt();
        var turnoNombre = GetTurnoNombre(turnoInt);
        var fecha       = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var semana      = GetSemanaActual();
        var turnoStr    = turnoNombre.ToLower();   // "mañana" | "tarde" | "noche"

        await using var conn = db.Create();

        // Formularios — consultas independientes
        var f01n = await conn.QueryFirstOrDefaultAsync<long>(
            "SELECT COUNT(*) FROM contadores_lectura WHERE fecha = @fecha AND turno_int = @turnoInt",
            new { fecha, turnoInt });

        var f02row = await conn.QueryFirstOrDefaultAsync(
            "SELECT COUNT(*) AS n, COALESCE(SUM(costo_quimica_turno),0) AS costo FROM operacion_gem_turno WHERE fecha = @fecha AND turno_int = @turnoInt",
            new { fecha, turnoInt });
        long   f02n    = f02row is IDictionary<string, object> d2 && d2["n"]    is long   ln ? ln : 0;
        double f02cost = f02row is IDictionary<string, object> d3 && d3["costo"] is decimal dc ? (double)dc : 0;

        var f03n = await conn.QueryFirstOrDefaultAsync<long>(
            "SELECT COUNT(*) FROM medicion_calidad WHERE fecha = @fecha AND turno_int = @turnoInt",
            new { fecha, turnoInt });

        var f05n = await conn.QueryFirstOrDefaultAsync<long>(
            """
            SELECT (
              (SELECT COUNT(*) FROM condiciones_mbr_turno  WHERE fecha = @fecha AND turno = @turnoStr) +
              (SELECT COUNT(*) FROM condiciones_ro_turno   WHERE fecha = @fecha AND turno = @turnoStr) +
              (SELECT COUNT(*) FROM condiciones_ptap_turno WHERE fecha = @fecha AND turno = @turnoStr)
            )
            """,
            new { fecha, turnoStr });

        // OTs de la semana actual filtradas por área PTAR
        var otsRow = await conn.QueryFirstOrDefaultAsync(
            """
            SELECT
              SUM(CASE WHEN UPPER(estado) NOT LIKE '%COMPLET%' THEN 1 ELSE 0 END) AS pendientes,
              SUM(CASE WHEN UPPER(estado)     LIKE '%COMPLET%' THEN 1 ELSE 0 END) AS completadas
            FROM mantenimientos_preventivos
            WHERE semana = @semana AND UPPER(gft) IN ('PTAR BOG', 'PTAR')
            """,
            new { semana });

        long otsPend = otsRow is IDictionary<string, object> dp && dp["pendientes"]  is long lp ? lp : 0;
        long otsComp = otsRow is IDictionary<string, object> dc2 && dc2["completadas"] is long lc ? lc : 0;

        var otsItems = (await conn.QueryAsync<OtResumenItem>(
            """
            SELECT id, objeto, criticidad, estado,
                   COALESCE(asignado_a, responsable) AS responsable
            FROM mantenimientos_preventivos
            WHERE semana = @semana
              AND UPPER(gft) IN ('PTAR BOG', 'PTAR')
              AND UPPER(estado) NOT LIKE '%COMPLET%'
            ORDER BY CASE criticidad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END
            LIMIT 10
            """,
            new { semana })).ToList();

        var criticas = otsItems.Count(o => string.Equals(o.Criticidad, "ALTA", StringComparison.OrdinalIgnoreCase));

        return Ok(new
        {
            fecha,
            turno_int    = turnoInt,
            turno_nombre = turnoNombre,
            formularios  = new object[]
            {
                new { codigo = "F-01", nombre = "Registro de Contadores",   completado = f01n > 0, registros = f01n },
                new { codigo = "F-02", nombre = "Consumo Químico",           completado = f02n > 0, registros = f02n, costo = f02cost },
                new { codigo = "F-03", nombre = "Calidad de Agua",           completado = f03n > 0, registros = f03n },
                new { codigo = "F-05", nombre = "Condiciones de Operación",  completado = f05n > 0, registros = f05n },
            },
            costo_turno = f02cost,
            ots = new
            {
                semana,
                total_pendientes    = otsPend,
                total_completadas   = otsComp,
                criticas_pendientes = criticas,
                items_pendientes    = otsItems,
            },
        });
    }
}

public record OtResumenItem(int Id, string? Objeto, string? Criticidad, string? Estado, string? Responsable);
