using System.ComponentModel.DataAnnotations;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Reactivos;

[ApiController]
[Route("api/reactivos")]
[Authorize]
public class ReactivosController(IDbConnectionFactory db) : ControllerBase
{
    // (nombre, sistema, col_L, col_kg, col_ppm, col_costo, col_final)
    private static readonly Dictionary<string, (string nombre, string sistema, string colL, string colKg, string colPpm, string colCosto, string colFinal)> QuimicosMap = new()
    {
        ["Q-01"] = ("Ácido",              "GEM",  "consumo_acido_l",         "kg_acido",               "ppm_acido",          "costo_op_acido",      "final_acido_l"),
        ["Q-02"] = ("Coagulante",         "GEM",  "consumo_coagulante_l",    "kg_coagulante",           "ppm_coagulante",     "costo_op_coagulante", "final_coagulante_l"),
        ["Q-03"] = ("Decolorante",        "GEM",  "consumo_decolorante_l",   "kg_decolorante",          "ppm_decolorante",    "costo_op_decolorante","final_decolorante_l"),
        ["Q-04"] = ("Polímero Aniónico",  "GEM",  "consumo_pol_anionico_l",  "consumo_pol_anionico_kg", "ppm_pol_anionico",   "costo_op_anionico",   "final_pol_anionico_kg"),
        ["Q-05"] = ("Polímero Catiónico", "GEM",  "consumo_pol_cationico_l", "consumo_pol_cationico_kg","ppm_pol_cationico",  "costo_op_cationico",  "final_pol_cationico_kg"),
        ["Q-06"] = ("HCL 10%",             "RO",   "consumo_l_hcl",           "consumo_kg_hcl",          "ppm_hcl",            "costo_op_hcl",        "inv_l_hcl"),
        ["Q-07"] = ("Kuriverter IK-220",  "RO",   "consumo_l_kuriverter",    "consumo_kg_kuriverter",   "ppm_kuriverter",     "costo_op_kuriverter", "inv_l_kuriverter"),
        ["Q-08"] = ("Vitec 7000",         "RO",   "consumo_l_vitec",         "consumo_kg_vitec",        "ppm_vitec",          "costo_op_vitec",      "inv_l_vitec"),
        ["Q-14"] = ("NaOH",               "RO",   "consumo_l_naoh",          "consumo_kg_naoh",         "ppm_naoh",           "costo_op_naoh",       "inv_l_naoh"),
        ["Q-15"] = ("Bisulfito de Sodio",  "RO",   "consumo_l_bisulfito",     "consumo_kg_bisulfito",    "ppm_bisulfito",      "costo_op_bisulfito",  "inv_l_bisulfito"),
        ["Q-09"] = ("Polímero An. PTAP",  "PTAP", "consumo_pol_anionico_ptap_l", "kg_pol_anionico_ptap", "ppm_pol_anionico_ptap", "costo_op_pol_anionico_ptap", "final_pol_anionico_ptap_l"),
        ["Q-10"] = ("Coagulante PTAP",    "PTAP", "consumo_coagulante_ptap_l",   "kg_coagulante_ptap",   "ppm_coagulante_ptap",   "costo_op_coagulante_ptap",   "final_coagulante_ptap_l"),
        ["Q-11"] = ("Ácido PTAP",         "PTAP", "consumo_acido_ptap_l",        "kg_acido_ptap",        "ppm_acido_ptap",        "costo_op_acido_ptap",        "final_acido_ptap_l"),
        ["Q-12"] = ("Soda",               "PTAP", "consumo_soda_l",              "kg_soda",              "ppm_soda",              "costo_op_soda",              "final_soda_l"),
        ["Q-13"] = ("Peróxido",           "PTAP", "consumo_peroxido_l",          "kg_peroxido",          "ppm_peroxido",          "costo_op_peroxido",          "final_peroxido_l"),
    };

    private static readonly Dictionary<string, string> SistemaTabla = new()
    { ["GEM"] = "operacion_gem_turno", ["RO"] = "operacion_ro_turno", ["PTAP"] = "operacion_ptap_turno" };

    private static readonly Dictionary<string, int> TurnoMap = new(StringComparer.OrdinalIgnoreCase)
    { ["manana"] = 2, ["mañana"] = 2, ["tarde"] = 3, ["noche"] = 1 };

    // ── GET /ultimo-nivel ────────────────────────────────────────────────────
    [HttpGet("ultimo-nivel")]
    public async Task<IActionResult> GetUltimoNivel([FromQuery] string quimico_id)
    {
        if (!QuimicosMap.TryGetValue(quimico_id, out var q))
            return Ok(new { nivel_final = (object?)null, fecha = (object?)null, turno = (object?)null });

        if (!SistemaTabla.TryGetValue(q.sistema, out var tabla))
            return Ok(new { nivel_final = (object?)null, fecha = (object?)null, turno = (object?)null });

        await using var conn = db.Create();
        try
        {
            var row = await conn.QueryFirstOrDefaultAsync($"""
                SELECT {q.colFinal} AS nivel_final,
                       DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                       CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' ELSE NULL END AS turno
                FROM {tabla}
                WHERE {q.colFinal} IS NOT NULL
                ORDER BY fecha DESC, turno DESC LIMIT 1
                """);
            return Ok(row ?? (object)new { nivel_final = (object?)null, fecha = (object?)null, turno = (object?)null });
        }
        catch { return Ok(new { nivel_final = (object?)null, fecha = (object?)null, turno = (object?)null }); }
    }

    // ── GET /ultimo-horometro ────────────────────────────────────────────────
    [HttpGet("ultimo-horometro")]
    public async Task<IActionResult> GetUltimoHorometro()
    {
        await using var conn = db.Create();
        var row = await conn.QueryFirstOrDefaultAsync("""
            SELECT horometro_inicial AS horometro,
                   DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                   CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' ELSE NULL END AS turno
            FROM operacion_gem_turno
            WHERE horometro_inicial IS NOT NULL AND horometro_inicial > 0
            ORDER BY fecha DESC, turno DESC LIMIT 1
            """);
        return Ok(row ?? (object)new { horometro = (object?)null, fecha = (object?)null, turno = (object?)null });
    }

    // ── GET / ────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetReactivos(
        [FromQuery] string? fecha,
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin,
        [FromQuery] string? sistema,
        [FromQuery] string? producto_nombre,
        [FromQuery] int limit = 500)
    {
        var filters = new List<string>();
        var p       = new DynamicParameters();
        p.Add("limit", Math.Clamp(limit, 1, 2000));

        if (fecha != null) { filters.Add("fecha = @fecha"); p.Add("fecha", fecha); }
        else if (fecha_inicio != null && fecha_fin != null)
        { filters.Add("fecha BETWEEN @fi AND @ff"); p.Add("fi", fecha_inicio); p.Add("ff", fecha_fin); }

        if (sistema != null) { filters.Add("sistema = @sistema"); p.Add("sistema", sistema.ToUpper()); }
        if (producto_nombre != null) { filters.Add("producto_nombre LIKE @pn"); p.Add("pn", $"%{producto_nombre.ToUpper()}%"); }

        var where = filters.Count > 0 ? "WHERE " + string.Join(" AND ", filters) : "";
        await using var conn = db.Create();
        var rows = await conn.QueryAsync($"""
            SELECT fecha, sistema, producto_id, producto_codigo, producto_nombre,
                   L_dia, kg_dia, ppm_promedio_dia, costo_dia, caudal_m3_dia
            FROM v_consumo_quimico_diario {where}
            ORDER BY fecha DESC, sistema, producto_nombre
            LIMIT @limit
            """, p);
        return Ok(rows);
    }

    // ── POST /batch ──────────────────────────────────────────────────────────
    [HttpPost("batch")]
    public async Task<IActionResult> BatchCreate([FromBody] List<RegistroReactivoIn> registros)
    {
        var today    = DateOnly.FromDateTime(DateTime.Today);
        int inserted = 0, updated = 0;

        var grouped = new Dictionary<(DateOnly, int, string), GrupoReactivo>();

        foreach (var reg in registros)
        {
            var fecha = reg.fecha ?? today;
            if (fecha > today)
                return BadRequest(new { detail = $"Fecha {fecha} no puede ser futura" });

            var turnoNorm = reg.turno.ToLower().Replace("ñ", "n");
            if (!TurnoMap.TryGetValue(turnoNorm, out var turnoInt))
                return BadRequest(new { detail = $"Turno inválido: {reg.turno}" });

            if (!QuimicosMap.TryGetValue(reg.id_quimico, out var q))
                return BadRequest(new { detail = $"Químico no soportado: {reg.id_quimico}" });

            var key = (fecha, turnoInt, q.sistema);
            if (!grouped.TryGetValue(key, out var g))
            {
                g = new GrupoReactivo
                {
                    Fecha       = fecha,
                    TurnoInt    = turnoInt,
                    Sistema     = q.sistema,
                    Usuario     = reg.usuario,
                    Equipo      = reg.equipo,
                    Horometro   = reg.horometro_inicial,
                    CaudalGem   = reg.caudal_tratado_gem,
                    HorasOp     = reg.horas_operacion,
                    LecturaEntradaActual  = reg.lectura_entrada_actual,
                    LecturaPermeadoActual = reg.lectura_permeado_actual,
                    CaudalEntradaMh       = reg.caudal_entrada_mh,
                    CaudalSalidaMh        = reg.caudal_salida_mh,
                    VolumenEntrada        = reg.volumen_entrada_m3,
                    VolumenPermeado       = reg.volumen_permeado_m3,
                    HorasOpSistema        = reg.horas_operacion_sistema,
                    CartuchosCambiados    = reg.cartuchos_cambiados,
                    CebsRealizados        = reg.cebs_realizados,
                    CebsCantidad          = reg.cebs_cantidad,
                    MangaCambiada         = reg.manga_cambiada,
                    MangaCantidad         = reg.manga_cantidad,
                };
                grouped[key] = g;
            }

            double? consumoL = reg.unidad == "L" ? reg.nivel_inicial - reg.nivel_final : null;
            double? ppm      = reg.caudal_tratado_gem > 0
                               ? reg.kg_consumidos / reg.caudal_tratado_gem * 1000 : null;

            g.Cols[q.colL]     = consumoL;
            g.Cols[q.colKg]    = reg.kg_consumidos;
            g.Cols[q.colPpm]   = ppm;
            g.Cols[q.colCosto] = reg.kg_consumidos * reg.precio_kg;
            g.Cols[q.colFinal] = reg.nivel_final;

            if (reg.id_quimico == "Q-02")
            {
                if (reg.ingreso_coagulante_l.HasValue)
                    g.Cols["ingreso_coagulante_l"] = reg.ingreso_coagulante_l;
                if (reg.trasegado_coagulante_ptap_l.HasValue)
                    g.Cols["trasegado_coagulante_ptap_l"] = reg.trasegado_coagulante_ptap_l;
            }
        }

        await using var conn = db.Create();
        await conn.OpenAsync();
        await using var tx = await conn.BeginTransactionAsync();

        foreach (var ((_, turnoInt, sistema), data) in grouped)
        {
            var tabla  = SistemaTabla.GetValueOrDefault(sistema, "operacion_gem_turno");
            var horas  = data.HorasOp;
            double? caudalMh = horas > 0 ? Math.Round(data.CaudalGem / horas, 2) : null;

            var cols    = new List<string> { "fecha", "turno", "dia_mes", "usuario" };
            var vals    = new List<string> { "@fecha", "@turno", "DAY(@fecha)", "@usuario" };
            var updates = new List<string>();
            var p       = new DynamicParameters();
            p.Add("fecha",   data.Fecha.ToString("yyyy-MM-dd"));
            p.Add("turno",   turnoInt);
            p.Add("usuario", data.Usuario);

            if (sistema == "GEM" && data.Horometro > 0)
            {
                cols.AddRange(["horometro_inicial", "caudal_total_tratado_gem_m3", "caudal_tratamiento_m3h"]);
                vals.AddRange(["@horometro", "@caudalGem", "@caudalMh"]);
                updates.AddRange(["horometro_inicial = @horometro",
                    "caudal_total_tratado_gem_m3 = @caudalGem",
                    "caudal_tratamiento_m3h = @caudalMh"]);
                p.Add("horometro", data.Horometro);
                p.Add("caudalGem", data.CaudalGem);
                p.Add("caudalMh",  caudalMh);
            }

            // Contadores RO
            if (sistema == "RO")
            {
                var roExtra = new Dictionary<string, object?>
                {
                    ["lectura_c12"]           = data.LecturaEntradaActual,
                    ["lectura_c13"]           = data.LecturaPermeadoActual,
                    ["caudal_entrada_mh"]     = data.CaudalEntradaMh,
                    ["caudal_salida_mh"]      = data.CaudalSalidaMh,
                    ["volumen_enviado_ro_m3"] = data.VolumenEntrada,
                    ["volumen_permeado_m3"]   = data.VolumenPermeado,
                    ["horas_operacion"]       = data.HorasOpSistema,
                    ["cartuchos_cambiados"]   = data.CartuchosCambiados.HasValue ? (data.CartuchosCambiados.Value ? 1 : 0) : (object?)null,
                };
                foreach (var (col, val) in roExtra)
                {
                    if (val is null) continue;
                    cols.Add(col); vals.Add($"@{col}"); updates.Add($"{col} = @{col}");
                    p.Add(col, val);
                }
            }

            // Contadores y mantenimiento PTAP
            if (sistema == "PTAP")
            {
                var ptapExtra = new Dictionary<string, object?>
                {
                    ["lectura_entrada"]    = data.LecturaEntradaActual,
                    ["lectura_permeado"]   = data.LecturaPermeadoActual,
                    ["caudal_entrada_mh"]  = data.CaudalEntradaMh,
                    ["caudal_salida_mh"]   = data.CaudalSalidaMh,
                    ["volumen_entrada_m3"] = data.VolumenEntrada,
                    ["volumen_permeado_m3"]= data.VolumenPermeado,
                    ["horas_operacion"]    = data.HorasOpSistema,
                };
                if (data.CebsRealizados.HasValue)
                {
                    ptapExtra["cebs_realizados"] = data.CebsRealizados.Value ? 1 : 0;
                    ptapExtra["cebs_cantidad"]   = data.CebsRealizados.Value ? (data.CebsCantidad ?? 1) : 0;
                }
                if (data.MangaCambiada.HasValue)
                {
                    ptapExtra["manga_cambiada"] = data.MangaCambiada.Value ? 1 : 0;
                    ptapExtra["manga_cantidad"] = data.MangaCambiada.Value ? (data.MangaCantidad ?? 1) : 0;
                }
                foreach (var (col, val) in ptapExtra)
                {
                    if (val is null) continue;
                    cols.Add(col); vals.Add($"@{col}"); updates.Add($"{col} = @{col}");
                    p.Add(col, val);
                }
            }

            if (data.Equipo != null)
            {
                cols.Add("equipo"); vals.Add("@equipo"); updates.Add("equipo = @equipo");
                p.Add("equipo", data.Equipo);
            }

            foreach (var (col, val) in data.Cols)
            {
                if (val is null) continue;
                cols.Add(col); vals.Add($"@{col}"); updates.Add($"{col} = @{col}");
                p.Add(col, val);
            }

            var updateClause = updates.Count > 0 ? string.Join(", ", updates) : "usuario = @usuario";
            var sql = $"""
                INSERT INTO {tabla} ({string.Join(", ", cols)})
                VALUES ({string.Join(", ", vals)})
                ON DUPLICATE KEY UPDATE {updateClause}
                """;

            var rc = await conn.ExecuteAsync(sql, p, transaction: tx);
            if (rc == 1) inserted++; else if (rc == 2) updated++;

            // Recalcular costo_quimica_turno para GEM
            if (sistema == "GEM")
            {
                await conn.ExecuteAsync("""
                    UPDATE operacion_gem_turno SET
                      costo_quimica_turno = (
                        COALESCE(costo_op_acido,0) + COALESCE(costo_op_coagulante,0) +
                        COALESCE(costo_op_decolorante,0) + COALESCE(costo_op_anionico,0) +
                        COALESCE(costo_op_cationico,0)
                      ),
                      pesos_por_m3 = IF(caudal_total_tratado_gem_m3 > 0,
                        (COALESCE(costo_op_acido,0)+COALESCE(costo_op_coagulante,0)+
                         COALESCE(costo_op_decolorante,0)+COALESCE(costo_op_anionico,0)+
                         COALESCE(costo_op_cationico,0)) / caudal_total_tratado_gem_m3, NULL)
                    WHERE fecha = @fecha AND turno = @turno
                    """, new { fecha = data.Fecha.ToString("yyyy-MM-dd"), turno = turnoInt }, tx);
            }
        }

        await tx.CommitAsync();
        return Ok(new { inserted, updated, total = inserted + updated });
    }

    // ── GET /ultima-lectura-ro ───────────────────────────────────────────────
    [HttpGet("ultima-lectura-ro")]
    public async Task<IActionResult> GetUltimaLecturaRo()
    {
        await using var conn = db.Create();
        try
        {
            // Primero: registros ingresados desde la app
            var c12 = await conn.ExecuteScalarAsync<decimal?>(
                "SELECT lectura_c12 FROM operacion_ro_turno WHERE lectura_c12 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
            if (c12 != null)
            {
                var c13  = await conn.ExecuteScalarAsync<decimal?>("SELECT lectura_c13 FROM operacion_ro_turno WHERE lectura_c12 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var fRO  = await conn.ExecuteScalarAsync<string?>("SELECT DATE_FORMAT(fecha,'%Y-%m-%d') FROM operacion_ro_turno WHERE lectura_c12 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var tRO  = await conn.ExecuteScalarAsync<string?>("SELECT CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' ELSE NULL END FROM operacion_ro_turno WHERE lectura_c12 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                return Ok(new { c12 = (double)c12, c13 = c13 != null ? (double?)((double)c13) : null, fecha = fRO, turno = tRO });
            }

            // Fallback: contadores_lectura (histórico Excel)
            var fc12 = await conn.ExecuteScalarAsync<long?>(
                "SELECT entrada_ro1 FROM contadores_lectura WHERE entrada_ro1 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
            if (fc12 != null)
            {
                var fc13 = await conn.ExecuteScalarAsync<long?>("SELECT salida_ro1 FROM contadores_lectura WHERE entrada_ro1 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var ffRO = await conn.ExecuteScalarAsync<string?>("SELECT DATE_FORMAT(fecha,'%Y-%m-%d') FROM contadores_lectura WHERE entrada_ro1 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var ftRO = await conn.ExecuteScalarAsync<string?>("SELECT CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' ELSE NULL END FROM contadores_lectura WHERE entrada_ro1 IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                return Ok(new { c12 = (double)fc12, c13 = fc13 != null ? (double?)((double)fc13) : null, fecha = ffRO, turno = ftRO });
            }
        }
        catch { }
        return Ok(new { c12 = (double?)null, c13 = (double?)null, fecha = (string?)null, turno = (string?)null });
    }

    // ── GET /ultima-lectura-ptap ─────────────────────────────────────────────
    [HttpGet("ultima-lectura-ptap")]
    public async Task<IActionResult> GetUltimaLecturaPtap()
    {
        await using var conn = db.Create();
        try
        {
            // Primero: registros ingresados desde la app
            var ent = await conn.ExecuteScalarAsync<decimal?>(
                "SELECT lectura_entrada FROM operacion_ptap_turno WHERE lectura_entrada IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
            if (ent != null)
            {
                var per  = await conn.ExecuteScalarAsync<decimal?>("SELECT lectura_permeado FROM operacion_ptap_turno WHERE lectura_entrada IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var fPT  = await conn.ExecuteScalarAsync<string?>("SELECT DATE_FORMAT(fecha,'%Y-%m-%d') FROM operacion_ptap_turno WHERE lectura_entrada IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var tPT  = await conn.ExecuteScalarAsync<string?>("SELECT CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' ELSE NULL END FROM operacion_ptap_turno WHERE lectura_entrada IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                return Ok(new { entrada = (double)ent, permeado = per != null ? (double?)((double)per) : null, fecha = fPT, turno = tPT });
            }

            // Fallback: contadores_lectura (histórico Excel)
            var fEnt = await conn.ExecuteScalarAsync<long?>(
                "SELECT ingreso_uf_ptap FROM contadores_lectura WHERE ingreso_uf_ptap IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
            if (fEnt != null)
            {
                var fPer = await conn.ExecuteScalarAsync<long?>("SELECT salida_uf_ptap FROM contadores_lectura WHERE ingreso_uf_ptap IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var ffPT = await conn.ExecuteScalarAsync<string?>("SELECT DATE_FORMAT(fecha,'%Y-%m-%d') FROM contadores_lectura WHERE ingreso_uf_ptap IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                var ftPT = await conn.ExecuteScalarAsync<string?>("SELECT CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' ELSE NULL END FROM contadores_lectura WHERE ingreso_uf_ptap IS NOT NULL ORDER BY fecha DESC, turno DESC LIMIT 1");
                return Ok(new { entrada = (double)fEnt, permeado = fPer != null ? (double?)((double)fPer) : null, fecha = ffPT, turno = ftPT });
            }
        }
        catch { }
        return Ok(new { entrada = (double?)null, permeado = (double?)null, fecha = (string?)null, turno = (string?)null });
    }

    // ── GET /resumen ──────────────────────────────────────────────────────────
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin,
        [FromQuery] string? sistema)
    {
        var filters = new List<string>
        {
            "(anio * 100 + mes) BETWEEN (YEAR(@fi) * 100 + MONTH(@fi)) AND (YEAR(@ff) * 100 + MONTH(@ff))"
        };
        var p = new DynamicParameters();
        p.Add("fi", fecha_inicio); p.Add("ff", fecha_fin);
        if (sistema != null) { filters.Add("sistema = @sistema"); p.Add("sistema", sistema.ToUpper()); }

        await using var conn = db.Create();
        var rows = await conn.QueryAsync(
            $"SELECT * FROM v_consumo_quimico_mensual WHERE {string.Join(" AND ", filters)} ORDER BY anio, mes, sistema, producto_nombre",
            p);
        return Ok(rows);
    }

    // ── GET /proyeccion ───────────────────────────────────────────────────────
    [HttpGet("proyeccion")]
    public async Task<IActionResult> GetProyeccion(
        [FromQuery] int anio,
        [FromQuery] int? mes,
        [FromQuery] string? sistema)
    {
        var filters = new List<string> { "anio = @anio" };
        var p = new DynamicParameters(); p.Add("anio", anio);
        if (mes.HasValue) { filters.Add("mes = @mes"); p.Add("mes", mes.Value); }
        if (sistema != null) { filters.Add("sistema = @sistema"); p.Add("sistema", sistema.ToUpper()); }

        await using var conn = db.Create();
        var rows = await conn.QueryAsync(
            $"SELECT * FROM v_quimico_real_vs_proyectado WHERE {string.Join(" AND ", filters)} ORDER BY mes, sistema, producto",
            p);
        return Ok(rows);
    }

    // ── GET /estadisticas ─────────────────────────────────────────────────────
    [HttpGet("estadisticas")]
    public async Task<IActionResult> GetEstadisticas(
        [FromQuery] int anio,
        [FromQuery] int? mes,
        [FromQuery] string? sistema)
    {
        var filters = new List<string> { "anio = @anio" };
        var p = new DynamicParameters(); p.Add("anio", anio);
        if (mes.HasValue) { filters.Add("mes = @mes"); p.Add("mes", mes.Value); }
        if (sistema != null) { filters.Add("sistema = @sistema"); p.Add("sistema", sistema.ToUpper()); }

        await using var conn = db.Create();
        var rows = await conn.QueryAsync(
            $"SELECT * FROM v_quimico_estadisticas_dia WHERE {string.Join(" AND ", filters)} ORDER BY mes, sistema, producto_nombre",
            p);
        return Ok(rows);
    }

    // ── GET /gem-eficiencia ───────────────────────────────────────────────────
    [HttpGet("gem-eficiencia")]
    public async Task<IActionResult> GetGemEficiencia(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT DATE_FORMAT(fecha,'%Y-%m-%d') AS fecha,
                   CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' END AS turno,
                   horometro_inicial,
                   caudal_total_tratado_gem_m3 AS caudal_m3,
                   caudal_tratamiento_m3h AS caudal_mh,
                   consumo_acido_l, consumo_coagulante_l, consumo_decolorante_l,
                   consumo_pol_anionico_kg, consumo_pol_cationico_kg,
                   ppm_acido, ppm_coagulante, ppm_decolorante, ppm_pol_anionico, ppm_pol_cationico,
                   costo_op_acido, costo_op_coagulante, costo_op_decolorante,
                   costo_op_anionico, costo_op_cationico,
                   costo_quimica_turno, kg_acido, kg_coagulante, kg_decolorante,
                   kg_pol_anionico, kg_pol_cationico, pesos_por_m3
            FROM operacion_gem_turno
            WHERE fecha BETWEEN @fi AND @ff
            ORDER BY fecha, turno
            """, new { fi = fecha_inicio, ff = fecha_fin });
        return Ok(rows);
    }

    // ── GET /ro-eficiencia ────────────────────────────────────────────────────
    [HttpGet("ro-eficiencia")]
    public async Task<IActionResult> GetRoEficiencia(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT DATE_FORMAT(fecha,'%Y-%m-%d') AS fecha,
                   CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' END AS turno,
                   volumen_enviado_ro_m3 AS caudal_m3,
                   horas_operacion,
                   caudal_entrada_mh,
                   caudal_salida_mh,
                   costo_quimica_turno,
                   pesos_m3_enviado_ro AS pesos_por_m3
            FROM operacion_ro_turno
            WHERE fecha BETWEEN @fi AND @ff
            ORDER BY fecha, turno
            """, new { fi = fecha_inicio, ff = fecha_fin });
        return Ok(rows);
    }

    // ── GET /edicion-gem ──────────────────────────────────────────────────────
    [HttpGet("edicion-gem")]
    public async Task<IActionResult> GetEdicionGem(
        [FromQuery] string fecha_inicio,
        [FromQuery] string fecha_fin,
        [FromQuery] int limit = 200,
        [FromQuery] int offset = 0)
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT id, DATE_FORMAT(fecha,'%Y-%m-%d') AS fecha,
                   CASE turno WHEN 1 THEN 'noche' WHEN 2 THEN 'mañana' WHEN 3 THEN 'tarde' END AS turno,
                   turno AS turno_int,
                   COALESCE(caudal_total_tratado_gem_m3,0) AS caudal_m3,
                   COALESCE(kg_acido,0) AS kg_acido, COALESCE(kg_coagulante,0) AS kg_coagulante,
                   COALESCE(kg_decolorante,0) AS kg_decolorante,
                   COALESCE(kg_pol_anionico,0) AS kg_pol_anionico,
                   COALESCE(kg_pol_cationico,0) AS kg_pol_cationico,
                   COALESCE(costo_quimica_turno,0) AS costo_quimica_turno, pesos_por_m3
            FROM operacion_gem_turno
            WHERE fecha BETWEEN @fi AND @ff
            ORDER BY fecha DESC, turno LIMIT @limit OFFSET @offset
            """, new { fi = fecha_inicio, ff = fecha_fin, limit, offset });
        return Ok(rows);
    }

    // ── PUT /edicion-gem/{id} ─────────────────────────────────────────────────
    [HttpPut("edicion-gem/{registro_id:int}")]
    public async Task<IActionResult> PutEdicionGem(int registro_id, [FromBody] EdicionGemIn body)
    {
        var updates = new Dictionary<string, object?>();
        if (body.caudal_total_tratado_gem_m3.HasValue) updates["caudal_total_tratado_gem_m3"] = body.caudal_total_tratado_gem_m3;
        if (body.kg_acido.HasValue)          updates["kg_acido"]         = body.kg_acido;
        if (body.kg_coagulante.HasValue)     updates["kg_coagulante"]    = body.kg_coagulante;
        if (body.kg_decolorante.HasValue)    updates["kg_decolorante"]   = body.kg_decolorante;
        if (body.kg_pol_anionico.HasValue)   updates["kg_pol_anionico"]  = body.kg_pol_anionico;
        if (body.kg_pol_cationico.HasValue)  updates["kg_pol_cationico"] = body.kg_pol_cationico;
        if (updates.Count == 0) return Ok(new { ok = true, updated = 0 });

        var p = new DynamicParameters(); p.Add("id", registro_id);
        foreach (var (k, v) in updates) p.Add(k, v);
        var setClause = string.Join(", ", updates.Keys.Select(k => $"{k} = @{k}"));

        await using var conn = db.Create();
        var rc = await conn.ExecuteAsync(
            $"UPDATE operacion_gem_turno SET {setClause} WHERE id = @id", p);
        return Ok(new { ok = true, updated = rc });
    }
}

// ── Modelos request ──────────────────────────────────────────────────────────
public record RegistroReactivoIn(
    DateOnly? fecha,
    [Required, MaxLength(20)]      string turno,
    [Required, MaxLength(100)]     string usuario,
    string? equipo,
    [Required, MaxLength(15)]      string id_quimico,
    [Required, MaxLength(100)]     string nombre_quimico,
    [Required, MaxLength(20)]      string unidad,
    [Range(0, 99_999)]             double densidad_kg,
    double nivel_inicial,
    double nivel_final,
    [Range(0, 99_999)]             double kg_consumidos,
    [Range(0, 99_999_999)]         double precio_kg,
    double horometro_inicial,
    double caudal_tratado_gem,
    [Range(0, 24)]                 double horas_operacion,
    string? observaciones,
    double? ingreso_coagulante_l,
    double? trasegado_coagulante_ptap_l,
    // Contadores RO/PTAP
    double? lectura_entrada_actual,
    double? lectura_permeado_actual,
    double? caudal_entrada_mh,
    double? caudal_salida_mh,
    double? volumen_entrada_m3,
    double? volumen_permeado_m3,
    double? horas_operacion_sistema,
    // RO: mantenimiento
    bool? cartuchos_cambiados,
    // PTAP: eventos de mantenimiento
    bool? cebs_realizados,
    int?  cebs_cantidad,
    bool? manga_cambiada,
    int?  manga_cantidad);

public record EdicionGemIn(
    double? caudal_total_tratado_gem_m3,
    double? kg_acido,
    double? kg_coagulante,
    double? kg_decolorante,
    double? kg_pol_anionico,
    double? kg_pol_cationico);

internal class GrupoReactivo
{
    public DateOnly Fecha    { get; set; }
    public int TurnoInt      { get; set; }
    public string Sistema    { get; set; } = "";
    public string Usuario    { get; set; } = "";
    public string? Equipo    { get; set; }
    public double Horometro  { get; set; }
    public double CaudalGem  { get; set; }
    public double HorasOp    { get; set; }
    // Contadores RO/PTAP
    public double? LecturaEntradaActual  { get; set; }
    public double? LecturaPermeadoActual { get; set; }
    public double? CaudalEntradaMh       { get; set; }
    public double? CaudalSalidaMh        { get; set; }
    public double? VolumenEntrada        { get; set; }
    public double? VolumenPermeado       { get; set; }
    public double? HorasOpSistema        { get; set; }
    // RO: mantenimiento
    public bool?   CartuchosCambiados    { get; set; }
    // PTAP: mantenimiento
    public bool?   CebsRealizados        { get; set; }
    public int?    CebsCantidad          { get; set; }
    public bool?   MangaCambiada         { get; set; }
    public int?    MangaCantidad         { get; set; }
    public Dictionary<string, double?> Cols { get; } = new();
}
