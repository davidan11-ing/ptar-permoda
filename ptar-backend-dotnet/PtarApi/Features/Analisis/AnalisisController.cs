using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;

namespace PtarApi.Features.Analisis;

[ApiController]
[Route("api/analisis")]
[Authorize(Roles = "encargado,administrador")]
public class AnalisisController(IDbConnectionFactory db) : ControllerBase
{
    // Fuentes disponibles con su SQL base y descripción de columnas
    private static readonly Dictionary<string, FuenteInfo> Fuentes = new()
    {
        ["balance_hidrico"] = new(
            "Balance Hídrico por turno",
            "SELECT fecha, turno, semana, contador_principal, entrada_ro1, permeado_ro1, rechazo_ro1, eficiencia_ro_pct, permeado_mbr1, permeado_mbr2, envio_th, acueducto_m3, total_agua_limpia_m3, consumo_gem_m3, lavanderia_m3, tintoreria_m3, rotativa_m3, ingreso_ptap, potable_ptap, indicador_lav_l_und, indicador_tin_l_kg, indicador_rot_l_m FROM v_balance_hidrico",
            "fecha"
        ),
        ["calidad_pivot"] = new(
            "Calidad por turno (tabla pivot)",
            "SELECT fecha, turno, parametro, parametro_unidad, pulmon, homogeneizador, gem_salida, anoxico, mbbr, mbr1_interno, mbr1_permeado, mbr2_interno, mbr2_permeado, vertimiento, ro1_compuesta, ro1_etapa1, ro1_etapa2, ro2_permeado, ro_rechazo, ptap_pozo, ptap_clari, ptap_uf FROM v_tabla_datos_1",
            "fecha"
        ),
        ["reactivos_gem"] = new(
            "Reactivos GEM — consumo y costos por turno",
            "SELECT fecha, sistema, producto_codigo, producto_nombre, L_dia AS litros, kg_dia AS kg, ppm_promedio_dia AS ppm, costo_dia AS costo_cop FROM v_consumo_quimico_diario",
            "fecha"
        ),
        ["contadores"] = new(
            "Lecturas de contadores por turno",
            "SELECT fecha, turno, hora_lectura, tanque_reuso_2in, ptar, entrada_ro1, salida_ro1, entrada_ro2, salida_ro2, mbr1, mbr2, medidor_verde_retorno, envio_th, ingreso_uf_ptap, salida_uf_ptap, entrada_ap_principal_6in, usuario FROM contadores_lectura",
            "fecha"
        ),
        ["condiciones_ro"] = new(
            "Condiciones de operación RO por turno",
            "SELECT fecha, turno, usuario, p_entrada_e1, p_salida_e1, p_entrada_e2, p_salida_e2, q_permeado_e1, q_permeado_e2, q_rechazo_rotametro, flujo_normalizado_e1, p_filtro_cartuchos, p_f1, p_f2, p_f3, fecha_cip, observaciones FROM condiciones_ro_turno",
            "fecha"
        ),
        ["condiciones_mbr"] = new(
            "Condiciones de operación MBR por turno",
            "SELECT fecha, turno, usuario, mbr1_caudal_permeado, mbr1_tmp, mbr1_nivel_tmp, mbr1_purga, mbr1_recirculacion, mbr2_caudal_permeado, mbr2_tmp, mbr2_nivel_tmp, mbr2_purga, mbr2_recirculacion, observaciones FROM condiciones_mbr_turno",
            "fecha"
        ),
        ["condiciones_ptap"] = new(
            "Condiciones de operación PTAP por turno",
            "SELECT fecha, turno, usuario, tmp_pantalla, tiempo_filtracion_min, tiempo_purga_clarif_min, frecuencia_purga_clarif_h, observaciones FROM condiciones_ptap_turno",
            "fecha"
        ),
        ["operacion_ro"] = new(
            "Operación RO — contadores y volúmenes por turno",
            "SELECT fecha, turno, usuario, lectura_c12, lectura_c13, caudal_entrada_mh, caudal_salida_mh, volumen_enviado_ro_m3, volumen_permeado_m3, horas_operacion, cartuchos_cambiados FROM operacion_ro_turno",
            "fecha"
        ),
        ["operacion_ptap"] = new(
            "Operación PTAP — contadores y mantenimiento por turno",
            "SELECT fecha, turno, usuario, lectura_entrada, lectura_permeado, caudal_entrada_mh, caudal_salida_mh, volumen_entrada_m3, volumen_permeado_m3, horas_operacion, cebs_realizados, cebs_cantidad, manga_cambiada, manga_cantidad FROM operacion_ptap_turno",
            "fecha"
        ),
    };

    // ── GET /api/analisis/fuentes ─────────────────────────────────────────────
    [HttpGet("fuentes")]
    public IActionResult GetFuentes() =>
        Ok(Fuentes.Select(kv => new { id = kv.Key, label = kv.Value.Label }));

    // ── POST /api/analisis/datos ──────────────────────────────────────────────
    [HttpPost("datos")]
    public async Task<IActionResult> GetDatos([FromBody] DatosRequest req)
    {
        if (!Fuentes.TryGetValue(req.Fuente, out var info))
            return BadRequest(new { detail = $"Fuente desconocida: {req.Fuente}" });

        var where = new List<string>();
        var p = new DynamicParameters();

        if (!string.IsNullOrEmpty(req.FechaInicio))
        {
            where.Add($"{info.FiltroFecha} >= @fi");
            p.Add("fi", req.FechaInicio);
        }
        if (!string.IsNullOrEmpty(req.FechaFin))
        {
            where.Add($"{info.FiltroFecha} <= @ff");
            p.Add("ff", req.FechaFin);
        }
        if (req.Turno.HasValue)
        {
            where.Add("turno = @turno");
            p.Add("turno", req.Turno.Value);
        }

        var whereClause = where.Count > 0 ? " WHERE " + string.Join(" AND ", where) : "";
        var limit = Math.Clamp(req.Limit ?? 5000, 1, 50000);
        var sql = $"{info.Sql}{whereClause} ORDER BY {info.FiltroFecha} DESC, turno DESC LIMIT {limit}";

        await using var conn = db.Create();
        var rows = (await conn.QueryAsync(sql, p)).ToList();

        if (rows.Count == 0)
            return Ok(new { columnas = Array.Empty<string>(), filas = Array.Empty<object>() });

        var columnas = ((IDictionary<string, object>)rows[0]).Keys.ToList();
        var filas = rows.Select(r =>
            ((IDictionary<string, object>)r).Values
                .Select(v => v is DBNull ? null : v?.ToString())
                .ToArray()
        ).ToList();

        return Ok(new { columnas, filas });
    }

    // ── GET /api/analisis/tablas ──────────────────────────────────────────────
    [HttpGet("tablas")]
    public async Task<IActionResult> GetTablas()
    {
        await using var conn = db.Create();
        var rows = await conn.QueryAsync<TablaTypeDb>(
            "SELECT TABLE_NAME AS TableName, TABLE_TYPE AS TableType " +
            "FROM information_schema.TABLES " +
            "WHERE TABLE_SCHEMA = DATABASE() " +
            "ORDER BY TABLE_TYPE, TABLE_NAME");
        var tablas = rows.Where(r => r.TableType == "BASE TABLE").Select(r => r.TableName).ToList();
        var vistas = rows.Where(r => r.TableType == "VIEW").Select(r => r.TableName).ToList();
        return Ok(new { tablas, vistas });
    }

    // ── GET /api/analisis/tabla/{nombre} ──────────────────────────────────────
    [HttpGet("tabla/{nombre}")]
    public async Task<IActionResult> GetTabla(
        string nombre,
        [FromQuery] string? fi,
        [FromQuery] string? ff,
        [FromQuery] int pagina = 1,
        [FromQuery] int limite = 100)
    {
        await using var conn = db.Create();

        // Validar que existe (BASE TABLE o VIEW), para prevenir injection en nombre
        var tablaInfo = await conn.QueryFirstOrDefaultAsync<TablaTypeDb>(
            "SELECT TABLE_NAME AS TableName, TABLE_TYPE AS TableType " +
            "FROM information_schema.TABLES " +
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @nombre",
            new { nombre });
        if (tablaInfo is null) return NotFound(new { detail = "Tabla no encontrada" });
        var tablaReal = tablaInfo.TableName;
        var isView    = tablaInfo.TableType == "VIEW";

        // Columnas con tipo y PK
        var columnas = (await conn.QueryAsync<ColInfoDb>(
            "SELECT COLUMN_NAME AS ColumnName, DATA_TYPE AS DataType, COLUMN_KEY AS ColumnKey " +
            "FROM information_schema.COLUMNS " +
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @nombre " +
            "ORDER BY ORDINAL_POSITION",
            new { nombre })).ToList();

        bool tieneFecha = columnas.Any(c => c.ColumnName == "fecha");
        bool tieneTurno = columnas.Any(c => c.ColumnName == "turno");
        bool tieneId    = columnas.Any(c => c.ColumnName == "id");

        var where = new List<string>();
        var p     = new DynamicParameters();

        if (tieneFecha)
        {
            if (!string.IsNullOrEmpty(fi)) { where.Add("fecha >= @fi"); p.Add("fi", fi); }
            if (!string.IsNullOrEmpty(ff)) { where.Add("fecha <= @ff"); p.Add("ff", ff); }
        }

        var whereClause = where.Count > 0 ? " WHERE " + string.Join(" AND ", where) : "";
        var orderBy     = tieneFecha ? (tieneTurno ? " ORDER BY fecha DESC, turno DESC" : " ORDER BY fecha DESC")
                        : tieneId   ? " ORDER BY id DESC"
                        : "";

        var lim    = Math.Clamp(limite, 1, 500);
        var offset = (Math.Max(1, pagina) - 1) * lim;

        var total = await conn.QueryFirstAsync<int>($"SELECT COUNT(*) FROM `{tablaReal}`{whereClause}", p);
        var rows  = await conn.QueryAsync($"SELECT * FROM `{tablaReal}`{whereClause}{orderBy} LIMIT {lim} OFFSET {offset}", p);

        var filas = rows
            .Select(r => ((IDictionary<string, object?>)r)
                .ToDictionary(kv => kv.Key, kv => kv.Value is DBNull ? null : kv.Value))
            .ToList();

        return Ok(new
        {
            columnas = columnas.Select(c => new
            {
                columnName = c.ColumnName,
                dataType   = c.DataType,
                isPk       = !isView && c.ColumnKey == "PRI",
            }),
            filas,
            total,
            isView,
        });
    }

    // ── PATCH /api/analisis/tabla/{nombre}/{id} ───────────────────────────────
    [HttpPatch("tabla/{nombre}/{id}")]
    public async Task<IActionResult> UpdateFila(
        string nombre,
        string id,
        [FromBody] Dictionary<string, string?> cambios)
    {
        await using var conn = db.Create();

        var tablaReal = await conn.QueryFirstOrDefaultAsync<string>(
            "SELECT TABLE_NAME FROM information_schema.TABLES " +
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @nombre AND TABLE_TYPE = 'BASE TABLE'",
            new { nombre });
        if (tablaReal is null) return NotFound(new { detail = "Tabla no encontrada" });

        var pkCol = await conn.QueryFirstOrDefaultAsync<string>(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @nombre AND COLUMN_KEY = 'PRI'",
            new { nombre });
        if (pkCol is null) return BadRequest(new { detail = "La tabla no tiene clave primaria" });

        var colsValidas = (await conn.QueryAsync<string>(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS " +
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @nombre",
            new { nombre })).ToHashSet();

        var validos = cambios
            .Where(c => colsValidas.Contains(c.Key) && c.Key != pkCol)
            .ToList();

        if (validos.Count == 0) return Ok(new { affected = 0 });

        var dp = new DynamicParameters();
        dp.Add("pkVal", id);

        var setClauses = validos.Select((kv, i) =>
        {
            dp.Add($"v{i}", kv.Value);
            return $"`{kv.Key}` = @v{i}";
        }).ToList();

        var sql      = $"UPDATE `{tablaReal}` SET {string.Join(", ", setClauses)} WHERE `{pkCol}` = @pkVal";
        var affected = await conn.ExecuteAsync(sql, dp);

        return Ok(new { affected });
    }
}

record FuenteInfo(string Label, string Sql, string FiltroFecha);
record ColInfoDb(string ColumnName, string DataType, string ColumnKey);
record TablaTypeDb(string TableName, string TableType);

public record DatosRequest(
    string  Fuente,
    string? FechaInicio = null,
    string? FechaFin    = null,
    int?    Turno       = null,
    int?    Limit       = null
);
