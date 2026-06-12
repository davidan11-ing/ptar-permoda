using Dapper;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Caudales;

[ApiController]
[Route("api/caudales")]
public class CaudalesController(IDbConnectionFactory db) : ControllerBase
{
    // Mapeo id_contador → columna en contadores_lectura
    private static readonly Dictionary<string, string> ContadorMap = new()
    {
        ["C-10"] = "tanque_reuso_2in",       ["C-11"] = "ptar",
        ["C-12"] = "entrada_ro1",            ["C-13"] = "salida_ro1",
        ["C-14"] = "entrada_ro2",            ["C-15"] = "salida_ro2",
        ["C-17"] = "medidor_verde_retorno",  ["C-19"] = "envio_th",
        ["C-20"] = "mbr1",                   ["C-21"] = "mbr2",
        ["C-22"] = "ingreso_uf_ptap",        ["C-23"] = "salida_uf_ptap",
        ["C-36"] = "gem_prueba",
        ["C-01"] = "entrada_ap_principal_6in",
        ["C-02"] = "entrada_ap_fria_lavanderia_4in",
        ["C-03"] = "entrada_ap_lab_lavanderia",
        ["C-04"] = "entrada_medidor_rojo_tintoreria_4in",
        ["C-05"] = "entrada_ap_fria_tintoreria_4in",
        ["C-06"] = "entrada_medidor_rojo_lavanderia_4in",
        ["C-07"] = "rama",                   ["C-08"] = "abridora_1",
        ["C-09"] = "abridora_2",             ["C-16"] = "entrada_ap_rotativa_3in",
        ["C-18"] = "entrada_ap_tintoreria_6in",
        ["C-24"] = "entrada_ap_ptar2_acueducto",
        ["C-25"] = "entrada_ap_puerta4_acueducto",
        ["C-26"] = "entrada_ap_quimicos",
        ["C-27"] = "agua_caliente_tintoreria",
        ["C-28"] = "medidor_prueba_agua_caliente",
        ["C-29"] = "entrada_ap_puerta2_acueducto",
        ["C-30"] = "entrada_ap_caldera_acueducto",
        ["C-31"] = "entrada_ap_puerta5_acueducto",
        ["C-32"] = "entrada_ap_puerta6_acueducto",
        ["C-33"] = "entrada_ap_puerta7_acueducto",
        ["C-34"] = "entrada_ap_lavanderia_acueducto",
        ["C-35"] = "entrada_ap_zona_lodos_acueducto",
    };

    private static readonly Dictionary<string, string> LecturaToConsumo = new()
    {
        ["tanque_reuso_2in"] = "cons_tanque_reuso_2in",
        ["ptar"]             = "cons_ptar",
        ["entrada_ro1"]      = "cons_entrada_ro1",
        ["salida_ro1"]       = "cons_salida_ro1",
        ["entrada_ro2"]      = "cons_entrada_ro2",
        ["salida_ro2"]       = "cons_salida_ro2",
        ["medidor_verde_retorno"] = "cons_medidor_verde_retorno",
        ["envio_th"]         = "cons_envio_th",
        ["mbr1"]             = "cons_mbr1",
        ["mbr2"]             = "cons_mbr2",
        ["ingreso_uf_ptap"]  = "cons_ingreso_uf_ptap",
        ["salida_uf_ptap"]   = "cons_salida_uf_ptap",
    };

    private static readonly Dictionary<int, string> TurnoHoraMap = new()
    { [1] = "22:00:00", [2] = "06:00:00", [3] = "14:00:00" };

    private static readonly Dictionary<string, int> TurnoIntMap = new(StringComparer.OrdinalIgnoreCase)
    { ["manana"] = 2, ["mañana"] = 2, ["tarde"] = 3, ["noche"] = 1 };

    // ── GET / ────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetBalance(
        [FromQuery] string? fecha,
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin,
        [FromQuery] int? turno,
        [FromQuery] int limit = 500)
    {
        var filters = new List<string>();
        var p = new DynamicParameters();
        p.Add("limit", Math.Clamp(limit, 1, 2000));

        if (fecha != null) { filters.Add("fecha = @fecha"); p.Add("fecha", fecha); }
        else if (fecha_inicio != null && fecha_fin != null)
        { filters.Add("fecha BETWEEN @fi AND @ff"); p.Add("fi", fecha_inicio); p.Add("ff", fecha_fin); }

        if (turno.HasValue) { filters.Add("turno = @turno"); p.Add("turno", turno.Value); }

        var where = filters.Count > 0 ? "WHERE " + string.Join(" AND ", filters) : "";

        await using var conn = db.Create();
        var rows = await conn.QueryAsync($"""
            SELECT fecha, turno, semana,
                   ingreso_ptap, potable_ptap, carrotanques_m3, mulas_funza_m3,
                   contador_principal,
                   entrada_ro1, permeado_ro1, rechazo_ro1, eficiencia_ro_pct,
                   permeado_mbr1, permeado_mbr2, envio_th,
                   acueducto_m3, total_agua_limpia_m3, consumo_gem_m3,
                   lavanderia_m3, tintoreria_m3, rotativa_m3,
                   und_efectivas, kg_tela, m_tela,
                   indicador_lav_l_und, indicador_tin_l_kg, indicador_rot_l_m,
                   rollover_detectado
            FROM v_balance_hidrico {where}
            ORDER BY fecha DESC, turno DESC
            LIMIT @limit
            """, p);

        return Ok(rows);
    }

    // ── POST /batch ──────────────────────────────────────────────────────────
    [HttpPost("batch")]
    public async Task<IActionResult> BatchCreate([FromBody] List<LecturaContadorIn> registros)
    {
        var today    = DateOnly.FromDateTime(DateTime.Today);
        int inserted = 0, updated = 0;

        // Agrupar por (fecha, turno)
        var grouped = new Dictionary<(DateOnly, int), GroupedLectura>();

        foreach (var reg in registros)
        {
            var fecha = reg.fecha ?? today;
            if (fecha > today)
                return BadRequest(new { detail = $"Fecha {fecha} no puede ser futura" });

            var turnoNorm = reg.turno.ToLower().Replace("ñ", "n");
            if (!TurnoIntMap.TryGetValue(turnoNorm, out var turnoInt))
                return BadRequest(new { detail = $"Turno inválido: {reg.turno}" });

            if (!ContadorMap.TryGetValue(reg.id_contador, out var colName))
                return BadRequest(new { detail = $"Contador no soportado: {reg.id_contador}" });

            var key = (fecha, turnoInt);
            if (!grouped.TryGetValue(key, out var g))
            {
                g = new GroupedLectura { Usuario = reg.usuario, Equipo = reg.equipo };
                grouped[key] = g;
            }
            g.Cols[colName] = reg.lectura_actual_m3;
        }

        await using var conn = db.Create();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        foreach (var ((fecha, turnoInt), data) in grouped)
        {
            var hora   = TurnoHoraMap.GetValueOrDefault(turnoInt, "12:00:00");
            var cols   = new List<string> { "fecha", "turno", "hora_lectura", "usuario" };
            var vals   = new List<string> { "@fecha", "@turno", $"'{hora}'", "@usuario" };
            var updates = new List<string> { "usuario = @usuario" };
            var p      = new DynamicParameters();
            p.Add("fecha",   fecha.ToString("yyyy-MM-dd"));
            p.Add("turno",   turnoInt);
            p.Add("usuario", data.Usuario);

            if (data.Equipo != null)
            {
                cols.Add("equipo"); vals.Add("@equipo"); updates.Add("equipo = @equipo");
                p.Add("equipo", data.Equipo);
            }

            foreach (var (col, val) in data.Cols)
            {
                cols.Add(col); vals.Add($"@{col}"); updates.Add($"{col} = @{col}");
                p.Add(col, val);
            }

            var sql = $"""
                INSERT INTO contadores_lectura ({string.Join(", ", cols)})
                VALUES ({string.Join(", ", vals)})
                ON DUPLICATE KEY UPDATE
                    {string.Join(", ", updates)},
                    actualizado_en = CURRENT_TIMESTAMP
                """;

            var rc = await conn.ExecuteAsync(sql, p, transaction: tx);
            if (rc == 1) inserted++; else if (rc == 2) updated++;

            // Sincronizar consumo_turno
            await SyncConsumoTurnoAsync(conn, tx, fecha, turnoInt);
        }

        await tx.CommitAsync();
        return Ok(new { inserted, updated, total = inserted + updated });
    }

    private async Task SyncConsumoTurnoAsync(
        MySqlConnector.MySqlConnection conn,
        MySqlConnector.MySqlTransaction tx,
        DateOnly fecha, int turnoInt)
    {
        var fechaStr = fecha.ToString("yyyy-MM-dd");
        var current = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT * FROM contadores_lectura WHERE fecha = @fecha AND turno = @turno",
            new { fecha = fechaStr, turno = turnoInt }, tx);
        if (current is null) return;

        var prev = await conn.QueryFirstOrDefaultAsync<dynamic>("""
            SELECT * FROM contadores_lectura
            WHERE (fecha < @fecha) OR (fecha = @fecha AND turno < @turno)
            ORDER BY fecha DESC, turno DESC LIMIT 1
            """, new { fecha = fechaStr, turno = turnoInt }, tx);
        if (prev is null) return;

        var deltas     = new Dictionary<string, double>();
        var rollover   = 0;
        var currDict   = (IDictionary<string, object>)current;
        var prevDict   = (IDictionary<string, object>)prev;

        foreach (var (lectCol, consCol) in LecturaToConsumo)
        {
            if (!currDict.TryGetValue(lectCol, out var cv) || cv is null) continue;
            if (!prevDict.TryGetValue(lectCol, out var pv) || pv is null) continue;
            double delta = Convert.ToDouble(cv) - Convert.ToDouble(pv);
            if (delta < 0) { rollover = 1; delta = 0; }
            deltas[consCol] = delta;
        }

        if (deltas.Count == 0) return;

        var cols    = new List<string> { "fecha", "turno", "rollover_detectado" };
        var vals    = new List<string> { "@fecha", "@turno", "@rollover" };
        var updates = new List<string> { "rollover_detectado = @rollover" };
        var dp      = new DynamicParameters();
        dp.Add("fecha",    fechaStr);
        dp.Add("turno",    turnoInt);
        dp.Add("rollover", rollover);

        foreach (var (col, val) in deltas)
        {
            cols.Add(col); vals.Add($"@{col}"); updates.Add($"{col} = @{col}");
            dp.Add(col, val);
        }

        await conn.ExecuteAsync($"""
            INSERT INTO consumo_turno ({string.Join(", ", cols)})
            VALUES ({string.Join(", ", vals)})
            ON DUPLICATE KEY UPDATE {string.Join(", ", updates)}
            """, dp, tx);
    }

    // ── GET /ultimas-lecturas ─────────────────────────────────────────────────
    [HttpGet("ultimas-lecturas")]
    public async Task<IActionResult> GetUltimasLecturas()
    {
        await using var conn = db.Create();

        // Por cada columna buscamos el último valor no-nulo independientemente,
        // porque una fila reciente puede tener solo algunos contadores llenados.
        var selects = ContadorMap.Values
            .Select(col => $"(SELECT `{col}` FROM contadores_lectura WHERE `{col}` IS NOT NULL AND fecha <= CURDATE() ORDER BY fecha DESC, turno DESC LIMIT 1) AS `{col}`");
        var sql = "SELECT " + string.Join(", ", selects);

        var row = await conn.QueryFirstOrDefaultAsync<dynamic>(sql);
        if (row is null) return Ok(new { });

        var result = new Dictionary<string, object>();
        var dict   = (IDictionary<string, object>)row;
        foreach (var (contId, colName) in ContadorMap)
        {
            if (dict.TryGetValue(colName, out var v) && v is not null)
                result[contId] = v;
        }
        return Ok(result);
    }

    // ── GET /resumen ───────────────────────────────────────────────────────────
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT medidor, descripcion,
                   ROUND(COALESCE(SUM(m3), 0), 2) AS total_m3,
                   COUNT(*) AS n_turnos
            FROM (
                SELECT 'envio_th' AS medidor, 'Envío a TH' AS descripcion, envio_th AS m3 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'ingreso_ptap', 'Ingreso PTAP', ingreso_ptap FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'potable_ptap', 'Potable PTAP', potable_ptap FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'entrada_ro1', 'Entrada RO1 (m³)', entrada_ro1 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'permeado_ro1', 'Permeado RO1', permeado_ro1 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'rechazo_ro1', 'Rechazo RO1', rechazo_ro1 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'consumo_gem_m3', 'Caudal tratado GEM', consumo_gem_m3 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'lavanderia_m3', 'Lavandería', lavanderia_m3 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'tintoreria_m3', 'Tintorería', tintoreria_m3 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
                UNION ALL SELECT 'acueducto_m3', 'Acueducto (calculado)', acueducto_m3 FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
            ) u WHERE m3 IS NOT NULL AND m3 > 0
            GROUP BY medidor, descripcion ORDER BY total_m3 DESC
            """, new { fi = fecha_inicio, ff = fecha_fin });
        return Ok(rows);
    }

    // ── GET /edicion ──────────────────────────────────────────────────────────
    [HttpGet("edicion")]
    public async Task<IActionResult> GetEdicion(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin,
        [FromQuery] int limit = 200,
        [FromQuery] int offset = 0)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT id,
                   DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                   CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' END AS turno,
                   turno AS turno_int, hora_lectura,
                   tanque_reuso_2in, ptar, envio_th,
                   entrada_ro1, salida_ro1, entrada_ro2, salida_ro2,
                   mbr1, mbr2, ingreso_uf_ptap, salida_uf_ptap,
                   medidor_verde_retorno
            FROM contadores_lectura
            WHERE fecha BETWEEN @fi AND @ff
            ORDER BY fecha DESC, turno
            LIMIT @limit OFFSET @offset
            """, new { fi = fecha_inicio, ff = fecha_fin, limit, offset });
        return Ok(rows);
    }

    // ── PUT /edicion/{id} ─────────────────────────────────────────────────────
    [HttpPut("edicion/{registro_id:int}")]
    public async Task<IActionResult> PutEdicion(int registro_id, [FromBody] EdicionCaudalesIn body)
    {
        var updates = new Dictionary<string, object?>();
        if (body.tanque_reuso_2in.HasValue)      updates["tanque_reuso_2in"]      = body.tanque_reuso_2in;
        if (body.ptar.HasValue)                  updates["ptar"]                  = body.ptar;
        if (body.envio_th.HasValue)              updates["envio_th"]              = body.envio_th;
        if (body.entrada_ro1.HasValue)           updates["entrada_ro1"]           = body.entrada_ro1;
        if (body.salida_ro1.HasValue)            updates["salida_ro1"]            = body.salida_ro1;
        if (body.entrada_ro2.HasValue)           updates["entrada_ro2"]           = body.entrada_ro2;
        if (body.salida_ro2.HasValue)            updates["salida_ro2"]            = body.salida_ro2;
        if (body.mbr1.HasValue)                  updates["mbr1"]                  = body.mbr1;
        if (body.mbr2.HasValue)                  updates["mbr2"]                  = body.mbr2;
        if (body.ingreso_uf_ptap.HasValue)       updates["ingreso_uf_ptap"]       = body.ingreso_uf_ptap;
        if (body.salida_uf_ptap.HasValue)        updates["salida_uf_ptap"]        = body.salida_uf_ptap;
        if (body.medidor_verde_retorno.HasValue) updates["medidor_verde_retorno"] = body.medidor_verde_retorno;

        if (updates.Count == 0) return Ok(new { ok = true, updated = 0 });

        var p = new DynamicParameters();
        p.Add("id", registro_id);
        foreach (var (k, v) in updates) p.Add(k, v);

        var setClause = string.Join(", ", updates.Keys.Select(k => $"{k} = @{k}"));
        await using var conn = db.Create();
        var rc = await conn.ExecuteAsync(
            $"UPDATE contadores_lectura SET {setClause}, actualizado_en = CURRENT_TIMESTAMP WHERE id = @id", p);
        return Ok(new { ok = true, updated = rc });
    }
}

// ── Modelos request ──────────────────────────────────────────────────────────
public record LecturaContadorIn(
    DateOnly? fecha,
    string turno,
    string usuario,
    string? equipo,
    string id_contador,
    string nombre_contador,
    string ubicacion,
    string tipo_agua,
    double lectura_anterior_m3,
    double lectura_actual_m3,
    string? observaciones);

public record EdicionCaudalesIn(
    int? tanque_reuso_2in,
    int? ptar,
    int? envio_th,
    int? entrada_ro1,
    int? salida_ro1,
    int? entrada_ro2,
    int? salida_ro2,
    int? mbr1,
    int? mbr2,
    int? ingreso_uf_ptap,
    int? salida_uf_ptap,
    int? medidor_verde_retorno);

internal class GroupedLectura
{
    public string Usuario  { get; set; } = "";
    public string? Equipo  { get; set; }
    public Dictionary<string, double> Cols { get; } = new();
}
