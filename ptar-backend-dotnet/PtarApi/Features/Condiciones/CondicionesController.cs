using Dapper;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Condiciones;

[ApiController]
[Route("api/condiciones")]
public class CondicionesController(IDbConnectionFactory db) : ControllerBase
{
    private static readonly Dictionary<string, int> TurnoMap = new(StringComparer.OrdinalIgnoreCase)
    { ["manana"] = 2, ["mañana"] = 2, ["tarde"] = 3, ["noche"] = 1 };

    private static int ParseTurno(string turno) =>
        TurnoMap.TryGetValue(turno.ToLower().Replace("ñ", "n"), out var v) ? v : 2;

    // ── GET /ultima-mbr ──────────────────────────────────────────────────────
    [HttpGet("ultima-mbr")]
    public async Task<IActionResult> GetUltimaMbr()
    {
        await using var conn = db.Create();
        try
        {
            var row = await conn.QueryFirstOrDefaultAsync(
                "SELECT * FROM condiciones_mbr_turno ORDER BY fecha DESC, turno DESC LIMIT 1");
            return Ok(row ?? (object)new { });
        }
        catch { return Ok(new { }); }
    }

    // ── GET /ultima-ro ───────────────────────────────────────────────────────
    [HttpGet("ultima-ro")]
    public async Task<IActionResult> GetUltimaRo()
    {
        await using var conn = db.Create();
        try
        {
            var row = await conn.QueryFirstOrDefaultAsync(
                "SELECT * FROM condiciones_ro_turno ORDER BY fecha DESC, turno DESC LIMIT 1");
            var result = row is IDictionary<string, object> d
                ? new Dictionary<string, object?>(d)
                : new Dictionary<string, object?>();

            // Última fecha CIP independiente del turno
            try
            {
                var cip = await conn.QueryFirstOrDefaultAsync(
                    "SELECT fecha_cip FROM condiciones_ro_turno WHERE fecha_cip IS NOT NULL ORDER BY fecha_cip DESC LIMIT 1");
                result["ultima_cip"] = cip is IDictionary<string, object> cd && cd.ContainsKey("fecha_cip")
                    ? cd["fecha_cip"]?.ToString() : null;
            }
            catch { result["ultima_cip"] = null; }

            return Ok(result);
        }
        catch { return Ok(new { }); }
    }

    // ── GET /ultima-ptap ─────────────────────────────────────────────────────
    [HttpGet("ultima-ptap")]
    public async Task<IActionResult> GetUltimaPtap()
    {
        await using var conn = db.Create();
        try
        {
            var row = await conn.QueryFirstOrDefaultAsync(
                "SELECT * FROM condiciones_ptap_turno ORDER BY fecha DESC, turno DESC LIMIT 1");
            return Ok(row ?? (object)new { });
        }
        catch { return Ok(new { }); }
    }

    // ── GET /caudales-ro ─────────────────────────────────────────────────────
    [HttpGet("caudales-ro")]
    public async Task<IActionResult> GetCaudalesRo([FromQuery] string fecha, [FromQuery] string turno)
    {
        var turnoInt = ParseTurno(turno);
        await using var conn = db.Create();
        try
        {
            var row = await conn.QueryFirstOrDefaultAsync("""
                SELECT caudal_entrada_mh, caudal_salida_mh
                FROM operacion_ro_turno
                WHERE fecha = @fecha AND turno = @turno LIMIT 1
                """, new { fecha, turno = turnoInt });
            return Ok(row ?? (object)new { caudal_entrada_mh = (object?)null, caudal_salida_mh = (object?)null });
        }
        catch { return Ok(new { caudal_entrada_mh = (object?)null, caudal_salida_mh = (object?)null }); }
    }

    // ── GET /caudales-ptap ───────────────────────────────────────────────────
    [HttpGet("caudales-ptap")]
    public async Task<IActionResult> GetCaudalesPtap([FromQuery] string fecha, [FromQuery] string turno)
    {
        var turnoInt = ParseTurno(turno);
        await using var conn = db.Create();
        try
        {
            var row = await conn.QueryFirstOrDefaultAsync("""
                SELECT caudal_entrada_mh, caudal_salida_mh,
                       manga_cambiada, manga_cantidad,
                       cebs_realizados, cebs_cantidad
                FROM operacion_ptap_turno
                WHERE fecha = @fecha AND turno = @turno LIMIT 1
                """, new { fecha, turno = turnoInt });
            return Ok(row ?? (object)new { });
        }
        catch { return Ok(new { }); }
    }

    // ── POST /mbr ────────────────────────────────────────────────────────────
    [HttpPost("mbr")]
    public async Task<IActionResult> PostMbr([FromBody] CondicionesMbrIn body)
    {
        var fecha  = body.fecha ?? DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");
        var turno  = ParseTurno(body.turno);
        var m1     = body.mbr1 ?? new MbrUnidadIn();
        var m2     = body.mbr2 ?? new MbrUnidadIn();

        await using var conn = db.Create();
        await conn.ExecuteAsync("""
            INSERT INTO condiciones_mbr_turno
                (fecha, turno, usuario,
                 mbr1_caudal_permeado, mbr1_tmp, mbr1_nivel_tmp,
                 mbr1_purga, mbr1_purga_min, mbr1_recirculacion, mbr1_recirculacion_min, mbr1_observaciones,
                 mbr2_caudal_permeado, mbr2_tmp, mbr2_nivel_tmp,
                 mbr2_purga, mbr2_purga_min, mbr2_recirculacion, mbr2_recirculacion_min, mbr2_observaciones,
                 observaciones)
            VALUES
                (@fecha, @turno, @usuario,
                 @m1cp, @m1tmp, @m1niv, @m1pu, @m1pum, @m1re, @m1rem, @m1obs,
                 @m2cp, @m2tmp, @m2niv, @m2pu, @m2pum, @m2re, @m2rem, @m2obs,
                 @obs)
            ON DUPLICATE KEY UPDATE
                usuario=@usuario,
                mbr1_caudal_permeado=@m1cp, mbr1_tmp=@m1tmp, mbr1_nivel_tmp=@m1niv,
                mbr1_purga=@m1pu, mbr1_purga_min=@m1pum,
                mbr1_recirculacion=@m1re, mbr1_recirculacion_min=@m1rem, mbr1_observaciones=@m1obs,
                mbr2_caudal_permeado=@m2cp, mbr2_tmp=@m2tmp, mbr2_nivel_tmp=@m2niv,
                mbr2_purga=@m2pu, mbr2_purga_min=@m2pum,
                mbr2_recirculacion=@m2re, mbr2_recirculacion_min=@m2rem, mbr2_observaciones=@m2obs,
                observaciones=@obs
            """, new
        {
            fecha, turno, usuario = body.usuario,
            m1cp  = m1.caudal_permeado,   m1tmp = m1.tmp,   m1niv = m1.nivel_tmp,
            m1pu  = m1.purga ? 1 : 0,     m1pum = m1.purga        ? m1.purga_min        : null,
            m1re  = m1.recirculacion ? 1 : 0, m1rem = m1.recirculacion ? m1.recirculacion_min : null,
            m1obs = m1.observaciones,
            m2cp  = m2.caudal_permeado,   m2tmp = m2.tmp,   m2niv = m2.nivel_tmp,
            m2pu  = m2.purga ? 1 : 0,     m2pum = m2.purga        ? m2.purga_min        : null,
            m2re  = m2.recirculacion ? 1 : 0, m2rem = m2.recirculacion ? m2.recirculacion_min : null,
            m2obs = m2.observaciones,
            obs   = body.observaciones,
        });
        return Ok(new { ok = true });
    }

    // ── POST /ro ─────────────────────────────────────────────────────────────
    [HttpPost("ro")]
    public async Task<IActionResult> PostRo([FromBody] CondicionesRoIn body)
    {
        var fecha = body.fecha ?? DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");
        var turno = ParseTurno(body.turno);

        await using var conn = db.Create();
        await conn.ExecuteAsync("""
            INSERT INTO condiciones_ro_turno
                (fecha, turno, usuario,
                 p_entrada_e1, p_salida_e1, p_entrada_e2, p_salida_e2,
                 q_permeado_e1, q_permeado_e2, q_rechazo_rotametro,
                 flujo_normalizado_e1, p_filtro_cartuchos,
                 p_f1, p_f2, p_f3, fecha_cip, observaciones)
            VALUES
                (@fecha, @turno, @usuario,
                 @pe1, @ps1, @pe2, @ps2,
                 @qe1, @qe2, @qrr,
                 @fn1, @pfc, @pf1, @pf2, @pf3, @cip, @obs)
            ON DUPLICATE KEY UPDATE
                usuario=@usuario,
                p_entrada_e1=@pe1, p_salida_e1=@ps1, p_entrada_e2=@pe2, p_salida_e2=@ps2,
                q_permeado_e1=@qe1, q_permeado_e2=@qe2, q_rechazo_rotametro=@qrr,
                flujo_normalizado_e1=@fn1, p_filtro_cartuchos=@pfc,
                p_f1=@pf1, p_f2=@pf2, p_f3=@pf3,
                fecha_cip=COALESCE(@cip, fecha_cip),
                observaciones=@obs
            """, new
        {
            fecha, turno, usuario = body.usuario,
            pe1 = body.p_entrada_e1,    ps1 = body.p_salida_e1,
            pe2 = body.p_entrada_e2,    ps2 = body.p_salida_e2,
            qe1 = body.q_permeado_e1,   qe2 = body.q_permeado_e2,
            qrr = body.q_rechazo_rotametro, fn1 = body.flujo_normalizado_e1,
            pfc = body.p_filtro_cartuchos,
            pf1 = body.p_f1, pf2 = body.p_f2, pf3 = body.p_f3,
            cip = body.fecha_cip, obs = body.observaciones,
        });
        return Ok(new { ok = true });
    }

    // ── POST /ptap ───────────────────────────────────────────────────────────
    [HttpPost("ptap")]
    public async Task<IActionResult> PostPtap([FromBody] CondicionesPtapIn body)
    {
        var fecha = body.fecha ?? DateOnly.FromDateTime(DateTime.Today).ToString("yyyy-MM-dd");
        var turno = ParseTurno(body.turno);

        await using var conn = db.Create();
        await conn.ExecuteAsync("""
            INSERT INTO condiciones_ptap_turno
                (fecha, turno, usuario,
                 tmp_pantalla, tiempo_filtracion_min,
                 tiempo_purga_clarif_min, frecuencia_purga_clarif_h,
                 observaciones)
            VALUES
                (@fecha, @turno, @usuario, @tmp, @tfilm, @tpurg, @fpurg, @obs)
            ON DUPLICATE KEY UPDATE
                usuario=@usuario,
                tmp_pantalla=@tmp, tiempo_filtracion_min=@tfilm,
                tiempo_purga_clarif_min=@tpurg, frecuencia_purga_clarif_h=@fpurg,
                observaciones=@obs
            """, new
        {
            fecha, turno, usuario = body.usuario,
            tmp   = body.tmp_pantalla, tfilm = body.tiempo_filtracion_min,
            tpurg = body.tiempo_purga_clarif_min, fpurg = body.frecuencia_purga_clarif_h,
            obs   = body.observaciones,
        });
        return Ok(new { ok = true });
    }
}

// ── Modelos request ──────────────────────────────────────────────────────────
public record MbrUnidadIn(
    double? caudal_permeado   = null,
    double? tmp               = null,
    string? nivel_tmp         = null,
    bool    purga             = false,
    int?    purga_min         = null,
    bool    recirculacion     = false,
    int?    recirculacion_min = null,
    string? observaciones     = null);

public record CondicionesMbrIn(
    string? fecha,
    string  turno,
    string? usuario,
    MbrUnidadIn? mbr1,
    MbrUnidadIn? mbr2,
    string? observaciones);

public record CondicionesRoIn(
    string? fecha,
    string  turno,
    string? usuario,
    double? p_entrada_e1,
    double? p_salida_e1,
    double? p_entrada_e2,
    double? p_salida_e2,
    double? q_permeado_e1,
    double? q_permeado_e2,
    double? q_rechazo_rotametro,
    double? flujo_normalizado_e1,
    double? p_filtro_cartuchos,
    double? p_f1,
    double? p_f2,
    double? p_f3,
    string? fecha_cip,
    string? observaciones);

public record CondicionesPtapIn(
    string? fecha,
    string  turno,
    string? usuario,
    double? tmp_pantalla,
    int?    tiempo_filtracion_min,
    int?    tiempo_purga_clarif_min,
    double? frecuencia_purga_clarif_h,
    string? observaciones);
