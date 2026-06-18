using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PtarApi.Data;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PtarApi.Features.Reportes;

[ApiController]
[Route("api/reportes")]
[Authorize(Roles = "encargado,administrador")]
public class ReportesController(IDbConnectionFactory db) : ControllerBase
{
    // ── GET /pdf ─────────────────────────────────────────────────────────────
    [HttpGet("pdf")]
    public async Task<IActionResult> GetPdf(
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin)
    {
        var fi = fecha_inicio ?? DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd");
        var ff = fecha_fin    ?? DateTime.Today.ToString("yyyy-MM-dd");

        await using var conn = db.Create();

        // Calidad — estadísticas DQO para vertimiento
        var calidadRows = await conn.QueryAsync("""
            SELECT parametro, unidad, promedio, minimo, maximo, n_mediciones
            FROM v_calidad_estadisticas
            WHERE (anio * 100 + mes) BETWEEN (YEAR(@fi)*100+MONTH(@fi)) AND (YEAR(@ff)*100+MONTH(@ff))
              AND unidad_codigo = 'VERTIMIENTO'
            ORDER BY parametro
            """, new { fi, ff });

        // Balance hídrico — totales
        var balanceRow = await conn.QueryFirstOrDefaultAsync("""
            SELECT COALESCE(SUM(envio_th),0) AS envio_th,
                   COALESCE(SUM(consumo_gem_m3),0) AS gem_m3,
                   COALESCE(SUM(entrada_ro1),0) AS ro1_m3,
                   COUNT(DISTINCT fecha) AS dias
            FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
            """, new { fi, ff });

        // Costos
        var costosRow = await conn.QueryFirstOrDefaultAsync("""
            SELECT COALESCE(SUM(costo_dia),0) AS costo_total,
                   COALESCE(SUM(kg_dia),0) AS kg_total
            FROM v_consumo_quimico_diario WHERE fecha BETWEEN @fi AND @ff
            """, new { fi, ff });

        var pdf = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(1.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Text("INFORME OPERATIVO PTAR — PERMODA LTDA")
                        .FontSize(14).Bold().FontColor(Colors.Blue.Darken2);
                    col.Item().Text($"Período: {fi} al {ff}")
                        .FontSize(10).FontColor(Colors.Grey.Darken1);
                    col.Item().LineHorizontal(1);
                });

                page.Content().PaddingTop(10).Column(col =>
                {
                    // Balance hídrico
                    col.Item().Text("BALANCE HÍDRICO").Bold().FontSize(12);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c => { c.RelativeColumn(); c.RelativeColumn(); });
                        table.Header(h => {
                            h.Cell().Text("Indicador").Bold();
                            h.Cell().Text("Valor").Bold();
                        });
                        var bd = (IDictionary<string, object>?)balanceRow;
                        table.Cell().Text("Caudal enviado a producción (m³)");
                        table.Cell().Text(bd?["envio_th"]?.ToString() ?? "—");
                        table.Cell().Text("Caudal tratado GEM (m³)");
                        table.Cell().Text(bd?["gem_m3"]?.ToString() ?? "—");
                        table.Cell().Text("Días con datos");
                        table.Cell().Text(bd?["dias"]?.ToString() ?? "—");
                    });

                    col.Item().PaddingTop(10).Text("COSTOS REACTIVOS").Bold().FontSize(12);
                    var cd = (IDictionary<string, object>?)costosRow;
                    col.Item().Text($"Costo total: ${cd?["costo_total"]:N0} COP");
                    col.Item().Text($"Kg totales: {cd?["kg_total"]:N1} kg");

                    col.Item().PaddingTop(10).Text("CALIDAD VERTIMIENTO").Bold().FontSize(12);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(2); c.RelativeColumn(); c.RelativeColumn(); c.RelativeColumn();
                        });
                        table.Header(h => {
                            h.Cell().Text("Parámetro").Bold();
                            h.Cell().Text("Promedio").Bold();
                            h.Cell().Text("Mín").Bold();
                            h.Cell().Text("Máx").Bold();
                        });
                        foreach (var r in calidadRows)
                        {
                            var rd = (IDictionary<string, object>)r;
                            table.Cell().Text(rd["parametro"]?.ToString() ?? "");
                            table.Cell().Text(rd["promedio"]?.ToString() ?? "");
                            table.Cell().Text(rd["minimo"]?.ToString() ?? "");
                            table.Cell().Text(rd["maximo"]?.ToString() ?? "");
                        }
                    });
                });

                page.Footer().AlignCenter().Text(x =>
                {
                    x.Span("Generado: ").FontColor(Colors.Grey.Darken1);
                    x.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm")).FontColor(Colors.Grey.Darken1);
                    x.Span("  Página ");
                    x.CurrentPageNumber();
                    x.Span(" de ");
                    x.TotalPages();
                });
            });
        });

        var bytes = pdf.GeneratePdf();
        return File(bytes, "application/pdf", $"informe_ptar_{fi}_{ff}.pdf");
    }

    // ── GET /calidad-html ─────────────────────────────────────────────────────
    [HttpGet("calidad-html")]
    public async Task<IActionResult> GetCalidadHtml(
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin)
    {
        var fi = fecha_inicio ?? DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd");
        var ff = fecha_fin    ?? DateTime.Today.ToString("yyyy-MM-dd");

        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT * FROM v_calidad_estadisticas
            WHERE (anio * 100 + mes) BETWEEN (YEAR(@fi)*100+MONTH(@fi)) AND (YEAR(@ff)*100+MONTH(@ff))
            ORDER BY parametro, orden_tren
            """, new { fi, ff });

        var html = BuildHtmlTable("CALIDAD DEL AGUA — " + fi + " al " + ff, rows,
            ["Parámetro", "Unidad", "N", "Mín", "Máx", "Promedio", "CV%"],
            r =>
            {
                var d = (IDictionary<string, object>)r;
                return [
                    d["parametro"]?.ToString() ?? "",
                    d["unidad"]?.ToString() ?? "",
                    d["n_mediciones"]?.ToString() ?? "",
                    d["minimo"]?.ToString() ?? "",
                    d["maximo"]?.ToString() ?? "",
                    d["promedio"]?.ToString() ?? "",
                    d["cv_pct"]?.ToString() ?? "",
                ];
            });

        return Content(html, "text/html");
    }

    // ── GET /balance-html ─────────────────────────────────────────────────────
    [HttpGet("balance-html")]
    public async Task<IActionResult> GetBalanceHtml(
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin)
    {
        var fi = fecha_inicio ?? DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd");
        var ff = fecha_fin    ?? DateTime.Today.ToString("yyyy-MM-dd");

        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT fecha, turno, envio_th, consumo_gem_m3, entrada_ro1, permeado_ro1,
                   eficiencia_ro_pct, total_agua_limpia_m3
            FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff
            ORDER BY fecha DESC, turno DESC LIMIT 200
            """, new { fi, ff });

        var html = BuildHtmlTable("BALANCE HÍDRICO — " + fi + " al " + ff, rows,
            ["Fecha", "Turno", "Envío TH (m³)", "GEM (m³)", "Entrada RO1", "Permeado RO1", "Efic RO%", "Total limpia"],
            r =>
            {
                var d = (IDictionary<string, object>)r;
                return [
                    d["fecha"]?.ToString() ?? "",
                    d["turno"]?.ToString() ?? "",
                    d["envio_th"]?.ToString() ?? "",
                    d["consumo_gem_m3"]?.ToString() ?? "",
                    d["entrada_ro1"]?.ToString() ?? "",
                    d["permeado_ro1"]?.ToString() ?? "",
                    d["eficiencia_ro_pct"]?.ToString() ?? "",
                    d["total_agua_limpia_m3"]?.ToString() ?? "",
                ];
            });

        return Content(html, "text/html");
    }

    // ── GET /costos-html ──────────────────────────────────────────────────────
    [HttpGet("costos-html")]
    public async Task<IActionResult> GetCostosHtml(
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin)
    {
        var fi = fecha_inicio ?? DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd");
        var ff = fecha_fin    ?? DateTime.Today.ToString("yyyy-MM-dd");

        await using var conn = db.Create();
        var rows = await conn.QueryAsync("""
            SELECT fecha, sistema, producto_nombre, kg_dia, costo_dia, ppm_promedio_dia
            FROM v_consumo_quimico_diario WHERE fecha BETWEEN @fi AND @ff
            ORDER BY fecha DESC, sistema, producto_nombre LIMIT 500
            """, new { fi, ff });

        var html = BuildHtmlTable("COSTOS REACTIVOS — " + fi + " al " + ff, rows,
            ["Fecha", "Sistema", "Producto", "kg/día", "Costo/día (COP)", "PPM prom"],
            r =>
            {
                var d = (IDictionary<string, object>)r;
                return [
                    d["fecha"]?.ToString() ?? "",
                    d["sistema"]?.ToString() ?? "",
                    d["producto_nombre"]?.ToString() ?? "",
                    d["kg_dia"]?.ToString() ?? "",
                    d["costo_dia"]?.ToString() ?? "",
                    d["ppm_promedio_dia"]?.ToString() ?? "",
                ];
            });

        return Content(html, "text/html");
    }

    // ── GET /dashboard-html ───────────────────────────────────────────────────
    [HttpGet("dashboard-html")]
    public async Task<IActionResult> GetDashboardHtml(
        [FromQuery] string? fecha_inicio,
        [FromQuery] string? fecha_fin)
    {
        var fi = fecha_inicio ?? DateTime.Today.AddDays(-30).ToString("yyyy-MM-dd");
        var ff = fecha_fin    ?? DateTime.Today.ToString("yyyy-MM-dd");

        await using var conn = db.Create();
        var caudal = await conn.QueryFirstOrDefaultAsync(
            "SELECT COALESCE(SUM(envio_th),0) AS total_m3, COUNT(DISTINCT fecha) AS dias FROM v_balance_hidrico WHERE fecha BETWEEN @fi AND @ff",
            new { fi, ff });
        var costo = await conn.QueryFirstOrDefaultAsync(
            "SELECT COALESCE(SUM(costo_dia),0) AS costo_total FROM v_consumo_quimico_diario WHERE fecha BETWEEN @fi AND @ff",
            new { fi, ff });

        var cDict  = (IDictionary<string, object>)caudal!;
        var ccDict = (IDictionary<string, object>)costo!;
        var totalM3    = cDict["total_m3"];
        var diasCount  = cDict["dias"];
        var costoTotal = ccDict["costo_total"];

        var html = $$"""
            <!DOCTYPE html><html><head><meta charset="utf-8">
            <title>Dashboard PTAR</title>
            <style>body{font-family:Arial;padding:20px;background:#0d1117;color:#e6edf3}
            .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin:8px;display:inline-block;min-width:200px}
            h1{color:#58a6ff}h2{color:#7ee787}
            </style></head><body>
            <h1>Dashboard PTAR — {{fi}} al {{ff}}</h1>
            <div class="card"><h2>Caudal</h2><p>{{totalM3}} m³ total</p><p>{{diasCount}} días</p></div>
            <div class="card"><h2>Costo Reactivos</h2><p>${{costoTotal}} COP</p></div>
            </body></html>
            """;

        return Content(html, "text/html");
    }

    // ── Helper: construir tabla HTML ──────────────────────────────────────────
    private static string BuildHtmlTable(
        string title,
        IEnumerable<dynamic> rows,
        string[] headers,
        Func<dynamic, string[]> rowMapper)
    {
        var sb = new System.Text.StringBuilder();
        sb.Append($$"""
            <!DOCTYPE html><html><head><meta charset="utf-8"><title>{{title}}</title>
            <style>
            body{font-family:Arial;font-size:11px;padding:16px;background:#0d1117;color:#e6edf3}
            table{border-collapse:collapse;width:100%}
            th{background:#1f6feb;color:#fff;padding:6px 8px;text-align:left}
            td{padding:5px 8px;border-bottom:1px solid #21262d}
            tr:hover td{background:#21262d}
            h2{color:#58a6ff}
            </style></head><body><h2>{{title}}</h2>
            <table><thead><tr>
            """);

        foreach (var h in headers)
            sb.Append($"<th>{h}</th>");
        sb.Append("</tr></thead><tbody>");

        foreach (var row in rows)
        {
            sb.Append("<tr>");
            foreach (var cell in rowMapper(row))
                sb.Append($"<td>{cell}</td>");
            sb.Append("</tr>");
        }

        sb.Append("</tbody></table></body></html>");
        return sb.ToString();
    }
}

