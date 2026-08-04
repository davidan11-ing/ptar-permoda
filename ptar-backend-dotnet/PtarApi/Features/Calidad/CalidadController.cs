using System.ComponentModel.DataAnnotations;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Calidad;

[ApiController]
[Route("api/calidad")]
[Authorize]
public class CalidadController(IDbConnectionFactory db) : ControllerBase
{
    private static readonly Dictionary<string, int> TurnoMap = new(StringComparer.OrdinalIgnoreCase)
    { ["manana"] = 2, ["mañana"] = 2, ["tarde"] = 3, ["noche"] = 1 };

    // ── GET / ────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetCalidad(
        [FromQuery] string? fecha,
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin,
        [FromQuery] int? turno,
        [FromQuery] string? parametro_codigo,
        [FromQuery] int limit = 500)
    {
        var filters = new List<string>();
        var p = new DynamicParameters(); p.Add("limit", Math.Clamp(limit, 1, 5000));

        if (fecha != null) { filters.Add("fecha = @fecha"); p.Add("fecha", fecha); }
        else if (fecha_inicio != null && fecha_fin != null)
        { filters.Add("fecha BETWEEN @fi AND @ff"); p.Add("fi", fecha_inicio); p.Add("ff", fecha_fin); }

        if (turno.HasValue) { filters.Add("turno = @turno"); p.Add("turno", turno.Value); }
        if (parametro_codigo != null) { filters.Add("parametro_codigo = @pc"); p.Add("pc", parametro_codigo.ToUpper()); }

        var where = filters.Count > 0 ? "WHERE " + string.Join(" AND ", filters) : "";
        await using var conn = db.Create();
        var rows = await conn.QueryAsync($"""
            SELECT fecha, turno, parametro_codigo, parametro, parametro_unidad,
                   pulmon, homogeneizador, gem_salida, anoxico, mbbr,
                   mbr1_interno, mbr2_interno, mbr1_permeado, mbr2_permeado,
                   vertimiento, ro1_compuesta, ro1_etapa1, ro1_etapa2,
                   ro2_permeado, ro_rechazo
            FROM v_tabla_datos_1 {where}
            ORDER BY fecha DESC, turno DESC, parametro LIMIT @limit
            """, p);
        return Ok(rows);
    }

    // ── POST /batch ──────────────────────────────────────────────────────────
    [HttpPost("batch")]
    public async Task<IActionResult> BatchCreate([FromBody] List<RegistroCalidadIn> registros)
    {
        var today    = DateOnly.FromDateTime(DateTime.Today);
        int inserted = 0, updated = 0;

        await using var conn = db.Create();
        await conn.OpenAsync();

        // Pre-cargar parámetros y unidades
        var paramRows = await conn.QueryAsync<(int id, string nombre)>(
            "SELECT id, nombre FROM parametro_calidad");
        var unitRows  = await conn.QueryAsync<(int id, string nombre)>(
            "SELECT id, nombre FROM unidad_tratamiento");

        var paramMap = paramRows.ToDictionary(r => r.nombre.ToUpper(), r => r.id);
        var unitMap  = unitRows.ToDictionary(r => r.nombre.ToUpper(), r => r.id);

        await using var tx = await conn.BeginTransactionAsync();

        foreach (var reg in registros)
        {
            var fecha = reg.fecha ?? today;
            if (fecha > today)
                return BadRequest(new { detail = $"Fecha {fecha} no puede ser futura" });

            var turnoNorm = reg.turno.ToLower().Replace("ñ", "n");
            if (!TurnoMap.TryGetValue(turnoNorm, out var turnoInt))
                return BadRequest(new { detail = $"Turno inválido: {reg.turno}" });

            // Resolver parámetro_id — exact match primero, luego contains
            var paramKey = reg.parametro.Trim().ToUpper();
            if (!paramMap.TryGetValue(paramKey, out var parametroId))
            {
                var match = paramMap.FirstOrDefault(kv => kv.Key.Contains(paramKey) || paramKey.Contains(kv.Key));
                if (match.Key == null)
                    return BadRequest(new { detail = $"Parámetro no encontrado: {reg.parametro}" });
                parametroId = match.Value;
            }

            // Resolver unidad_id
            var unitKey = reg.unidad_tratamiento.Trim().ToUpper();
            if (!unitMap.TryGetValue(unitKey, out var unidadId))
            {
                var match = unitMap.FirstOrDefault(kv => kv.Key.Contains(unitKey) || unitKey.Contains(kv.Key));
                if (match.Key == null)
                    return BadRequest(new { detail = $"Unidad no encontrada: {reg.unidad_tratamiento}" });
                unidadId = match.Value;
            }

            var rc = await conn.ExecuteAsync("""
                INSERT INTO medicion_calidad
                  (fecha, turno, parametro_id, unidad_id, valor, observacion, usuario, equipo, no_aplica)
                VALUES
                  (@fecha, @turno, @paramId, @unitId, @valor, @obs, @usuario, @equipo, @noAplica)
                ON DUPLICATE KEY UPDATE
                    valor       = @valor,
                    observacion = @obs,
                    usuario     = @usuario,
                    equipo      = @equipo,
                    no_aplica   = @noAplica
                """, new
            {
                fecha    = fecha.ToString("yyyy-MM-dd"),
                turno    = turnoInt,
                paramId  = parametroId,
                unitId   = unidadId,
                valor    = reg.no_aplica ? null : reg.valor,
                obs      = reg.observaciones,
                usuario  = reg.usuario,
                equipo   = reg.equipo,
                noAplica = reg.no_aplica ? 1 : 0,
            }, tx);

            if (rc == 1) inserted++; else if (rc == 2) updated++;
        }

        await tx.CommitAsync();
        return Ok(new { inserted, updated, total = inserted + updated });
    }

    // ── GET /ultimo-valor ────────────────────────────────────────────────────
    [HttpGet("ultimo-valor")]
    public async Task<IActionResult> GetUltimoValor(
        [FromQuery] string unidad_tratamiento,
        [FromQuery] string parametro)
    {
        await using var conn = db.Create();
        var row = await conn.QueryFirstOrDefaultAsync("""
            SELECT mc.valor,
                   DATE_FORMAT(mc.fecha,'%Y-%m-%d') AS fecha,
                   CASE mc.turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' ELSE NULL END AS turno
            FROM medicion_calidad mc
            JOIN parametro_calidad pc ON mc.parametro_id = pc.id
            JOIN unidad_tratamiento ut ON mc.unidad_id = ut.id
            WHERE UPPER(pc.nombre) LIKE UPPER(@parametro)
              AND UPPER(ut.nombre) LIKE UPPER(@unidad)
              AND mc.valor IS NOT NULL AND mc.no_aplica = 0
            ORDER BY mc.fecha DESC, mc.turno DESC LIMIT 1
            """, new { parametro = $"%{parametro}%", unidad = $"%{unidad_tratamiento}%" });

        return Ok(row ?? (object)new { valor = (object?)null, fecha = (object?)null, turno = (object?)null });
    }

    // ── GET /parametros ──────────────────────────────────────────────────────
    [HttpGet("parametros")]
    public async Task<IActionResult> GetParametros()
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync(
            "SELECT id, codigo, nombre, unidad AS unidad_medida FROM parametro_calidad ORDER BY nombre");
        return Ok(rows);
    }

    // ── GET /mediciones ──────────────────────────────────────────────────────
    [HttpGet("mediciones")]
    public async Task<IActionResult> GetMediciones(
        [FromQuery] string parametro,
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin,
        [FromQuery] int? turno,
        [FromQuery] bool solo_con_valor = true,
        [FromQuery] int limit = 5000)
    {
        var filters = new List<string>
        {
            "mc.fecha BETWEEN @fi AND @ff",
            "UPPER(p.nombre) = UPPER(@parametro)"
        };
        var p = new DynamicParameters();
        p.Add("fi", fecha_inicio); p.Add("ff", fecha_fin);
        p.Add("parametro", parametro); p.Add("limit", Math.Clamp(limit, 1, 20000));

        if (turno.HasValue) { filters.Add("mc.turno = @turno"); p.Add("turno", turno.Value); }
        if (solo_con_valor) { filters.Add("mc.valor IS NOT NULL"); filters.Add("mc.valor > 0"); }

        await using var conn = db.Create();
        var rows = await conn.QueryAsync($"""
            SELECT mc.fecha,
                   CASE mc.turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' END AS turno,
                   p.nombre AS parametro, u.nombre AS unidad_tratamiento,
                   CAST(mc.valor AS DECIMAL(18,4)) AS valor, mc.usuario
            FROM medicion_calidad mc
            JOIN parametro_calidad p ON p.id = mc.parametro_id
            JOIN unidad_tratamiento u ON u.id = mc.unidad_id
            WHERE {string.Join(" AND ", filters)}
            ORDER BY mc.fecha ASC, mc.turno ASC LIMIT @limit
            """, p);
        return Ok(rows);
    }

    // ── GET /estadisticas ────────────────────────────────────────────────────
    [HttpGet("estadisticas")]
    public async Task<IActionResult> GetEstadisticas(
        [FromQuery] int anio,
        [FromQuery] int? mes,
        [FromQuery] string? parametro_codigo,
        [FromQuery] string? unidad_codigo)
    {
        var filters = new List<string> { "anio = @anio" };
        var p = new DynamicParameters(); p.Add("anio", anio);
        if (mes.HasValue) { filters.Add("mes = @mes"); p.Add("mes", mes.Value); }
        if (parametro_codigo != null) { filters.Add("parametro_codigo = @pc"); p.Add("pc", parametro_codigo.ToUpper()); }
        if (unidad_codigo != null)    { filters.Add("unidad_codigo = @uc");    p.Add("uc", unidad_codigo.ToUpper()); }

        await using var conn = db.Create();
        var rows = await conn.QueryAsync(
            $"SELECT * FROM v_calidad_estadisticas WHERE {string.Join(" AND ", filters)} ORDER BY mes, parametro, orden_tren",
            p);
        return Ok(rows);
    }

    // ── GET /resumen ──────────────────────────────────────────────────────────
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT * FROM v_calidad_estadisticas
            WHERE (anio * 100 + mes)
                  BETWEEN (YEAR(@fi) * 100 + MONTH(@fi))
                  AND     (YEAR(@ff) * 100 + MONTH(@ff))
            ORDER BY anio, mes, parametro, orden_tren
            """, new { fi = fecha_inicio, ff = fecha_fin });
        return Ok(rows);
    }

    // ── GET /remociones ───────────────────────────────────────────────────────
    [HttpGet("remociones")]
    public async Task<IActionResult> GetRemociones(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin,
        [FromQuery] string? parametro_codigo,
        [FromQuery] int? turno)
    {
        var filters = new List<string> { "fecha BETWEEN @fi AND @ff" };
        var p = new DynamicParameters(); p.Add("fi", fecha_inicio); p.Add("ff", fecha_fin);
        if (parametro_codigo != null) { filters.Add("parametro_codigo = @pc"); p.Add("pc", parametro_codigo.ToUpper()); }
        if (turno.HasValue) { filters.Add("turno = @turno"); p.Add("turno", turno.Value); }

        await using var conn = db.Create();
        var rows = await conn.QueryAsync(
            $"SELECT * FROM v_calidad_remociones WHERE {string.Join(" AND ", filters)} ORDER BY fecha DESC, turno, parametro",
            p);
        return Ok(rows);
    }

    // ── GET /dispersion ───────────────────────────────────────────────────────
    [HttpGet("dispersion")]
    public async Task<IActionResult> GetDispersion(
        [FromQuery] string parametro,
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT DATE_FORMAT(mc.fecha,'%Y-%m-%d') AS fecha,
                   ut.nombre AS unidad_tratamiento,
                   MIN(mc.valor) AS minimo, MAX(mc.valor) AS maximo,
                   AVG(mc.valor) AS promedio, COUNT(*) AS n
            FROM medicion_calidad mc
            JOIN parametro_calidad pc ON pc.id = mc.parametro_id
            JOIN unidad_tratamiento ut ON ut.id = mc.unidad_id
            WHERE UPPER(pc.nombre) = UPPER(@parametro)
              AND mc.fecha BETWEEN @fi AND @ff
              AND mc.valor IS NOT NULL AND mc.no_aplica = 0
            GROUP BY mc.fecha, ut.nombre
            ORDER BY mc.fecha, ut.nombre
            """, new { parametro, fi = fecha_inicio, ff = fecha_fin });
        return Ok(rows);
    }

    // ── GET /mbr-eficiencia ───────────────────────────────────────────────────
    [HttpGet("mbr-eficiencia")]
    public async Task<IActionResult> GetMbrEficiencia(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT DATE_FORMAT(mc.fecha,'%Y-%m-%d') AS fecha,
                   CASE mc.turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' END AS turno,
                   ut.nombre AS unidad_tratamiento, pc.nombre AS parametro,
                   AVG(mc.valor) AS valor_promedio
            FROM medicion_calidad mc
            JOIN parametro_calidad pc ON pc.id = mc.parametro_id
            JOIN unidad_tratamiento ut ON ut.id = mc.unidad_id
            WHERE UPPER(pc.nombre) IN ('DQO','SST')
              AND ut.nombre IN ('MBR 1 Interno','MBR 2 Interno','MBR 1 Permeado','MBR 2 Permeado','GEM Salida')
              AND mc.fecha BETWEEN @fi AND @ff
              AND mc.valor IS NOT NULL AND mc.no_aplica = 0
            GROUP BY mc.fecha, mc.turno, ut.nombre, pc.nombre
            ORDER BY mc.fecha, mc.turno
            """, new { fi = fecha_inicio, ff = fecha_fin });
        return Ok(rows);
    }

    // ── GET /edicion ──────────────────────────────────────────────────────────
    [HttpGet("edicion")]
    public async Task<IActionResult> GetEdicion(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin,
        [FromQuery] int? turno,
        [FromQuery] int limit = 500,
        [FromQuery] int offset = 0)
    {
        var filters = new List<string> { "mc.fecha BETWEEN @fi AND @ff" };
        var p = new DynamicParameters();
        p.Add("fi", fecha_inicio); p.Add("ff", fecha_fin);
        p.Add("limit", limit); p.Add("offset", offset);
        if (turno.HasValue) { filters.Add("mc.turno = @turno"); p.Add("turno", turno.Value); }

        await using var conn = db.Create();
        var rows = await conn.QueryAsync($"""
            SELECT mc.id, DATE_FORMAT(mc.fecha,'%Y-%m-%d') AS fecha,
                   CASE mc.turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' END AS turno,
                   mc.turno AS turno_int, p.nombre AS parametro, u.nombre AS unidad_tratamiento,
                   mc.valor, mc.no_aplica, mc.observacion, mc.usuario
            FROM medicion_calidad mc
            JOIN parametro_calidad p ON p.id = mc.parametro_id
            JOIN unidad_tratamiento u ON u.id = mc.unidad_id
            WHERE {string.Join(" AND ", filters)}
            ORDER BY mc.fecha DESC, mc.turno, p.nombre, u.nombre
            LIMIT @limit OFFSET @offset
            """, p);
        return Ok(rows);
    }

    // ── PUT /edicion/{id} ─────────────────────────────────────────────────────
    [HttpPut("edicion/{registro_id:int}")]
    public async Task<IActionResult> PutEdicion(int registro_id, [FromBody] EdicionCalidadIn body)
    {
        var updates = new Dictionary<string, object?>();
        if (body.valor.HasValue)     updates["valor"]       = body.valor;
        if (body.no_aplica.HasValue) updates["no_aplica"]   = body.no_aplica.Value ? 1 : 0;
        if (body.observacion != null) updates["observacion"] = body.observacion;
        if (updates.Count == 0) return Ok(new { ok = true, updated = 0 });

        var p = new DynamicParameters(); p.Add("id", registro_id);
        foreach (var (k, v) in updates) p.Add(k, v);
        var setClause = string.Join(", ", updates.Keys.Select(k => $"{k} = @{k}"));

        await using var conn = db.Create();
        var rc = await conn.ExecuteAsync(
            $"UPDATE medicion_calidad SET {setClause} WHERE id = @id", p);
        return Ok(new { ok = true, updated = rc });
    }
}

// ── Modelos request ──────────────────────────────────────────────────────────
public record RegistroCalidadIn(
    DateOnly? fecha,
    [property: Required, MaxLength(20)]   string turno,
    [property: Required, MaxLength(100)]  string usuario,
    string? equipo,
    [property: Required, MaxLength(100)]  string unidad_tratamiento,
    [property: Required, MaxLength(100)]  string parametro,
    double? valor,
    bool no_aplica,
    string? observaciones);

public record EdicionCalidadIn(
    double? valor,
    bool? no_aplica,
    string? observacion);
