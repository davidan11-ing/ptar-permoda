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
        await using var conn = db.Create();

        // Formularios — consultas independientes
        var f01n = await conn.QueryFirstOrDefaultAsync<long>(
            "SELECT COUNT(*) FROM contadores_lectura WHERE fecha = @fecha AND turno = @turnoInt",
            new { fecha, turnoInt });

        var f02row = await conn.QueryFirstOrDefaultAsync(
            "SELECT COUNT(*) AS n, COALESCE(SUM(costo_quimica_turno),0) AS costo FROM operacion_gem_turno WHERE fecha = @fecha AND turno = @turnoInt",
            new { fecha, turnoInt });
        long   f02n    = f02row is IDictionary<string, object> d2 && d2["n"]    is long   ln ? ln : 0;
        double f02cost = f02row is IDictionary<string, object> d3 && d3["costo"] is decimal dc ? (double)dc : 0;

        var f03n = await conn.QueryFirstOrDefaultAsync<long>(
            "SELECT COUNT(*) FROM medicion_calidad WHERE fecha = @fecha AND turno = @turnoInt",
            new { fecha, turnoInt });

        var f05n = await conn.QueryFirstOrDefaultAsync<long>(
            """
            SELECT (
              (SELECT COUNT(*) FROM condiciones_mbr_turno  WHERE fecha = @fecha AND turno = @turnoInt) +
              (SELECT COUNT(*) FROM condiciones_ro_turno   WHERE fecha = @fecha AND turno = @turnoInt) +
              (SELECT COUNT(*) FROM condiciones_ptap_turno WHERE fecha = @fecha AND turno = @turnoInt)
            )
            """,
            new { fecha, turnoInt });

        // OTs del día actual filtradas por área PTAR BOG
        var otsRow = await conn.QueryFirstOrDefaultAsync(
            """
            SELECT
              CAST(SUM(CASE WHEN UPPER(estado) NOT LIKE '%COMPLET%' THEN 1 ELSE 0 END) AS SIGNED) AS pendientes,
              CAST(SUM(CASE WHEN UPPER(estado)     LIKE '%COMPLET%' THEN 1 ELSE 0 END) AS SIGNED) AS completadas
            FROM mantenimientos_preventivos
            WHERE DATE(dia_programado) = CURDATE() AND UPPER(gft) = 'PTAR BOG'
            """,
            new { });

        long otsPend = otsRow is IDictionary<string, object> dp && dp["pendientes"] is not null
            ? Convert.ToInt64(dp["pendientes"]) : 0;
        long otsComp = otsRow is IDictionary<string, object> dc2 && dc2["completadas"] is not null
            ? Convert.ToInt64(dc2["completadas"]) : 0;

        var otsItems = (await conn.QueryAsync<OtResumenItem>(
            """
            SELECT id, sharepoint_id, objeto, descripcion, criticidad, estado,
                   COALESCE(asignado_a, responsable) AS responsable
            FROM mantenimientos_preventivos
            WHERE DATE(dia_programado) = CURDATE()
              AND UPPER(gft) = 'PTAR BOG'
              AND UPPER(estado) NOT LIKE '%COMPLET%'
            ORDER BY CASE criticidad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END
            LIMIT 15
            """,
            new { })).ToList();

        var criticas = otsItems.Count(o => string.Equals(o.Criticidad, "ALTA", StringComparison.OrdinalIgnoreCase));

        const string SpBaseUrl =
            "https://permodaco.sharepoint.com/sites/CONFIABILIDAD/_layouts/15/listform.aspx" +
            "?PageType=4&ListId={9f6714c3-6a81-4773-90f3-0600085416af}&ID=";

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
                fecha,
                total_pendientes    = otsPend,
                total_completadas   = otsComp,
                criticas_pendientes = criticas,
                sp_base_url         = SpBaseUrl,
                items_pendientes    = otsItems,
            },
        });
    }
}

public record OtResumenItem(int Id, int? SharepointId, string? Objeto, string? Descripcion, string? Criticidad, string? Estado, string? Responsable);
