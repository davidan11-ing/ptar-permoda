from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from datetime import datetime, date
from zoneinfo import ZoneInfo
import io
from collections import defaultdict

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER

router = APIRouter()

# ══════════════════════════════════════════════════════════════════════════════
#  PDF — ReportLab
# ══════════════════════════════════════════════════════════════════════════════

AZUL_PTAR  = colors.HexColor("#00c5e3")
VERDE_PTAR = colors.HexColor("#3fb950")
AMBAR_PTAR = colors.HexColor("#d29922")
GRIS_FONDO = colors.HexColor("#f6f8fa")
GRIS_BORDE = colors.HexColor("#d0d7de")
BLANCO     = colors.white


def _tabla_style(header_color=AZUL_PTAR) -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  header_color),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  BLANCO),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",      (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [BLANCO, GRIS_FONDO]),
        ("GRID",          (0, 0), (-1, -1), 0.5, GRIS_BORDE),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ])


def _seccion_titulo(texto: str, styles, color=AZUL_PTAR) -> list:
    st = ParagraphStyle(
        "SeccionTitulo",
        parent=styles["Heading2"],
        textColor=color,
        spaceAfter=4,
        spaceBefore=12,
    )
    return [Paragraph(texto, st), HRFlowable(width="100%", thickness=1, color=color, spaceAfter=6)]


async def _generar_pdf(fi: str, ff: str, tipo: str, db: AsyncSession) -> bytes:
    buf    = io.BytesIO()
    doc    = SimpleDocTemplate(buf, pagesize=A4,
                               leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    story  = []

    titulo_st = ParagraphStyle("Titulo", parent=styles["Title"],
                               textColor=AZUL_PTAR, fontSize=16, spaceAfter=2)
    sub_st    = ParagraphStyle("Sub",    parent=styles["Normal"],
                               textColor=colors.grey, fontSize=9, spaceAfter=10)
    story.append(Paragraph("Informe PTAR — PERMODA LTDA", titulo_st))
    story.append(Paragraph(
        f"Período: {fi} al {ff}  ·  Tipo: {tipo.upper()}  ·  "
        f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        sub_st,
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=AZUL_PTAR, spaceAfter=12))

    if tipo in ("caudales", "completo"):
        rows_c = (await db.execute(text("""
            SELECT medidor, descripcion,
                   ROUND(COALESCE(SUM(m3), 0), 2) AS total_m3,
                   COUNT(*) AS lecturas
            FROM (
                SELECT 'Envío TH'              AS medidor, 'Envío a producción'       AS descripcion, envio_th            AS m3 FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Ingreso PTAP',          'Agua cruda ingresada PTAP',                          ingreso_ptap         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Potable PTAP',          'Agua potable de PTAP',                               potable_ptap         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Entrada RO1 (m³)',      'Entrada a ósmosis inversa',                          entrada_ro1          FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Permeado RO1',          'Permeado RO1',                                       permeado_ro1         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Rechazo RO1',           'Rechazo RO1',                                        rechazo_ro1          FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Caudal GEM',            'Caudal tratado por GEM',                             consumo_gem_m3       FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Lavandería',            'Agua a lavandería',                                  lavanderia_m3        FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Tintorería',            'Agua a tintorería (calculado)',                      tintoreria_m3        FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Rotativa',              'Agua a rotativa',                                    rotativa_m3          FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Acueducto (calc.)',      'Acueducto por diferencia',                           acueducto_m3         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
                UNION ALL
                SELECT 'Total agua limpia',     'Total agua limpia a producción',                     total_agua_limpia_m3 FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            ) u
            WHERE m3 IS NOT NULL AND m3 > 0
            GROUP BY medidor, descripcion
            ORDER BY total_m3 DESC
        """), {"fi": fi, "ff": ff})).mappings().all()

        story.extend(_seccion_titulo("F-01 · Balance Hídrico (m³)", styles, AZUL_PTAR))
        if rows_c:
            tabla_data = [["Medidor / Flujo", "Descripción", "Total m³", "Turnos"]]
            for r in rows_c:
                tabla_data.append([
                    r["medidor"], r["descripcion"],
                    f"{float(r['total_m3']):,.2f}", str(r["lecturas"]),
                ])
            t = Table(tabla_data, colWidths=[4*cm, 6*cm, 3*cm, 2.5*cm])
            t.setStyle(_tabla_style(AZUL_PTAR))
            story.append(t)
        else:
            story.append(Paragraph("Sin registros en el período.", styles["Normal"]))
        story.append(Spacer(1, 12))

    if tipo in ("reactivos", "completo"):
        rows_r = (await db.execute(text("""
            SELECT producto_nombre, sistema,
                   ROUND(SUM(kg_mes), 2)   AS kg_total,
                   ROUND(SUM(costo_mes))   AS costo_total,
                   SUM(dias_con_dato)      AS registros
            FROM v_consumo_quimico_mensual
            WHERE (anio * 100 + mes)
                  BETWEEN (YEAR(:fi) * 100 + MONTH(:fi))
                  AND     (YEAR(:ff) * 100 + MONTH(:ff))
            GROUP BY producto_id, producto_nombre, sistema
            HAVING SUM(costo_mes) > 0
            ORDER BY SUM(costo_mes) DESC
        """), {"fi": fi, "ff": ff})).mappings().all()

        story.extend(_seccion_titulo("F-02 · Reactivos Químicos", styles, VERDE_PTAR))
        if rows_r:
            tabla_data = [["Reactivo", "Sistema", "Kg Consumidos", "Costo (COP)", "Días"]]
            for r in rows_r:
                tabla_data.append([
                    r["producto_nombre"], r["sistema"],
                    f"{float(r['kg_total'] or 0):,.2f}",
                    f"${float(r['costo_total'] or 0):,.0f}",
                    str(r["registros"] or ""),
                ])
            costo_total = sum(float(r["costo_total"] or 0) for r in rows_r)
            tabla_data.append(["TOTAL", "", "", f"${costo_total:,.0f}", ""])
            t = Table(tabla_data, colWidths=[5*cm, 2.5*cm, 3.5*cm, 3.5*cm, 1.5*cm])
            ts = _tabla_style(VERDE_PTAR)
            ts.add("BACKGROUND", (0, len(tabla_data)-1), (-1, -1), GRIS_FONDO)
            ts.add("FONTNAME",   (0, len(tabla_data)-1), (-1, -1), "Helvetica-Bold")
            t.setStyle(ts)
            story.append(t)
        else:
            story.append(Paragraph("Sin registros en el período.", styles["Normal"]))
        story.append(Spacer(1, 12))

    if tipo in ("calidad", "completo"):
        rows_q = (await db.execute(text("""
            SELECT parametro, parametro_unidad AS unidad_medida,
                   unidad AS unidad_trat,
                   ROUND(AVG(promedio), 3)  AS promedio,
                   ROUND(MIN(minimo), 3)    AS minimo,
                   ROUND(MAX(maximo), 3)    AS maximo,
                   SUM(n_mediciones)        AS n_total
            FROM v_calidad_estadisticas
            WHERE (anio * 100 + mes)
                  BETWEEN (YEAR(:fi) * 100 + MONTH(:fi))
                  AND     (YEAR(:ff) * 100 + MONTH(:ff))
            GROUP BY parametro_codigo, parametro, parametro_unidad, unidad_codigo, unidad
            ORDER BY parametro, unidad_trat
        """), {"fi": fi, "ff": ff})).mappings().all()

        story.extend(_seccion_titulo("F-03 · Calidad del Agua", styles, AMBAR_PTAR))
        if rows_q:
            tabla_data = [["Parámetro", "Unidad medida", "Punto", "Promedio", "Mín", "Máx", "N"]]
            for r in rows_q:
                tabla_data.append([
                    r["parametro"],
                    r["unidad_medida"] or "—",
                    r["unidad_trat"],
                    str(r["promedio"] or "—"),
                    str(r["minimo"] or "—"),
                    str(r["maximo"] or "—"),
                    str(r["n_total"] or 0),
                ])
            t = Table(tabla_data, colWidths=[3.5*cm, 2.5*cm, 2.5*cm, 2*cm, 1.8*cm, 1.8*cm, 1.4*cm])
            t.setStyle(_tabla_style(AMBAR_PTAR))
            story.append(t)
        else:
            story.append(Paragraph("Sin registros en el período.", styles["Normal"]))
        story.append(Spacer(1, 12))

    story.append(HRFlowable(width="100%", thickness=0.5, color=GRIS_BORDE, spaceAfter=6))
    pie_st = ParagraphStyle("Pie", parent=styles["Normal"],
                            textColor=colors.grey, fontSize=7, alignment=TA_CENTER)
    story.append(Paragraph(
        "Documento generado automáticamente por el sistema PTAR — PERMODA LTDA  |  "
        f"Generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M')}",
        pie_st,
    ))

    doc.build(story)
    return buf.getvalue()


@router.get("/pdf")
async def generar_reporte_pdf(
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="YYYY-MM-DD"),
    tipo: str = Query("completo", description="caudales | reactivos | calidad | completo"),
    db: AsyncSession = Depends(get_db),
):
    if tipo not in ("caudales", "reactivos", "calidad", "completo"):
        tipo = "completo"
    pdf_bytes = await _generar_pdf(fecha_inicio, fecha_fin, tipo, db)
    nombre    = f"informe_ptar_{tipo}_{fecha_inicio}_{fecha_fin}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )


# ══════════════════════════════════════════════════════════════════════════════
#  Informe Calidad HTML  (imprimir desde navegador)
# ══════════════════════════════════════════════════════════════════════════════

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #0d1117;
  --card-bg: #161b22;
  --border: #30363d;
  --border-focus: rgba(0, 197, 227, 0.4);
  --text: #e6edf3;
  --text-muted: #8b949e;
  --cyan: #00c5e3;
  --cyan-bg: rgba(0, 197, 227, 0.1);
  --verde: #3fb950;
  --verde-bg: rgba(63, 185, 80, 0.1);
  --amarillo: #d29922;
  --amarillo-bg: rgba(210, 153, 34, 0.1);
  --rojo: #f85149;
  --rojo-bg: rgba(248, 81, 73, 0.1);
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-title: 'Outfit', sans-serif;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  margin: 0;
  padding: 0;
  line-height: 1.6;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: 1300px;
  margin: 0 auto;
  padding: 24px 24px 100px 24px;
}

.page-content {
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

body.lp-open .page-content { margin-left: 260px; }
body.rp-open .page-content { margin-right: 260px; }

/* Header styled beautifully */
.header {
  background: linear-gradient(135deg, #0f1c2d 0%, #161b22 100%);
  border-bottom: 2px solid var(--cyan);
  padding: 32px 40px;
  border-radius: 16px;
  margin: 24px auto;
  max-width: 1252px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(0, 197, 227, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.header h1 {
  font-family: var(--font-title);
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 8px 0;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header .sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 20px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.header .meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 13px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}

.header .meta span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
}

.header .meta strong {
  color: var(--cyan);
}

/* Sections */
.seccion {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s ease;
}

.seccion:hover {
  border-color: rgba(0, 197, 227, 0.2);
}

.seccion h2 {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin-top: 0;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
}

/* EXEC GRID & CARDS */
.exec-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.exec-card {
  background: #0d1117;
  border: 1px solid var(--border);
  border-top-width: 4px;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.exec-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.exec-card.verde { border-top-color: var(--verde); }
.exec-card.rojo { border-top-color: var(--rojo); }
.exec-card.amarillo { border-top-color: var(--amarillo); }

.exec-card .label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 8px;
}

.exec-card .valor {
  font-family: var(--font-title);
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 8px;
}

.exec-card.verde .valor { color: #56d364; }
.exec-card.rojo .valor { color: #ff7b72; }
.exec-card.amarillo .valor { color: #f2cc60; }

.exec-card .desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

/* FLOW TREATMENT TRAIN */
.tren-flow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  background: #0d1117;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 16px;
}

.tren-box {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  user-select: none;
}

.tren-box:hover {
  border-color: var(--cyan);
  background: var(--cyan-bg);
  color: #ffffff;
  transform: scale(1.03);
}

.tren-box.ro {
  border-color: var(--amarillo);
  background: var(--amarillo-bg);
}

.tren-box.vert {
  border-color: var(--verde);
  background: var(--verde-bg);
  color: #ffffff;
}

.tren-arrow {
  color: var(--text-muted);
  font-weight: bold;
  font-size: 16px;
  user-select: none;
}

/* TABS SYSTEM */
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
  margin-bottom: 24px;
}

.tab-btn {
  background: #161b22;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-btn:hover {
  background: #21262d;
  color: var(--text);
}

.tab-btn.active {
  background: var(--cyan-bg);
  border-color: var(--cyan) !important;
  color: var(--cyan);
  box-shadow: 0 0 12px rgba(0, 197, 227, 0.15);
}

.tab-n {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 2px 8px;
  font-size: 10px;
  color: var(--text);
}

.tab-panel {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* PARAMETER STYLING GRID */
.param-grid {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
}

@media (max-width: 900px) {
  .param-grid {
    grid-template-columns: 1fr;
  }
}

.param-card {
  background: #0d1117;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
}

.param-card h4 {
  font-family: var(--font-title);
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  margin-top: 0;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* TABLES STYLING */
table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  text-align: left;
}

th {
  background: #161b22;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
  color: var(--text);
  vertical-align: middle;
}

tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

tr.excede td {
  background: rgba(248, 81, 73, 0.03);
}

th.num, td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* BADGES */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.badge.conforme { background: var(--verde-bg); color: #56d364; border: 1px solid rgba(63, 185, 80, 0.2); }
.badge.critico { background: var(--rojo-bg); color: #ff7b72; border: 1px solid rgba(248, 81, 73, 0.2); }
.badge.alerta { background: var(--amarillo-bg); color: #f2cc60; border: 1px solid rgba(210, 153, 34, 0.2); }
.badge.neutro { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid var(--border); }
.badge.info { background: var(--cyan-bg); color: var(--cyan); border: 1px solid rgba(0, 197, 227, 0.2); }

/* ALERTA BOXES */
.alerta-box {
  display: flex;
  gap: 16px;
  background: #0d1117;
  border-left: 4px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.alerta-box.rojo { border-left-color: var(--rojo); background: rgba(248, 81, 73, 0.04); }
.alerta-box.amarillo { border-left-color: var(--amarillo); background: rgba(210, 153, 34, 0.04); }
.alerta-box.verde { border-left-color: var(--verde); background: rgba(63, 185, 80, 0.04); }

.alerta-box .icon {
  font-size: 20px;
  flex-shrink: 0;
}

.alerta-box .content strong {
  display: block;
  font-size: 14px;
  color: #ffffff;
  margin-bottom: 4px;
}

.alerta-box .content p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

/* STAT INTERPRETATION PANEL */
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.stat-val {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-val.ok { color: #56d364; }
.stat-val.bad { color: #ff7b72; }
.stat-val.warn { color: #f2cc60; }

/* REMOCIONES PROGRESS BARS */
.rem-bar-wrap {
  background: #21262d;
  height: 12px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.rem-bar {
  height: 100%;
  border-radius: 6px;
  transition: width 0.8s ease-in-out;
}

.rem-bar.alta { background: linear-gradient(90deg, #1f6feb 0%, #3fb950 100%); }
.rem-bar.media { background: linear-gradient(90deg, #d29922 0%, #3fb950 100%); }
.rem-bar.baja { background: linear-gradient(90deg, #f85149 0%, #d29922 100%); }

/* EVENT LIST */
.evento-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.evento {
  background: #0d1117;
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 20px;
}

.evento.critico { border-left-color: var(--rojo); }
.evento.alerta { border-left-color: var(--amarillo); }
.evento.verde { border-left-color: var(--verde); }

.evento-fecha {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  width: 90px;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 2px;
}

.evento-desc {
  font-size: 13px;
  color: #ffffff;
  font-weight: 600;
}

.evento-desc small {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 400;
  margin-top: 4px;
}

/* COSTOS CARDS */
.costo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.costo-card {
  background: #0d1117;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.costo-card .lbl {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  margin-bottom: 8px;
}

.costo-card .val {
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 6px;
}

.costo-card .sub {
  font-size: 11px;
  color: var(--text-muted);
}

/* FLOATING TOOLBARS (GLASSMORPHISM) */
.edit-toolbar, .print-panel {
  position: fixed;
  width: 240px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(22, 27, 34, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  z-index: 1000;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.edit-toolbar {
  left: 20px;
  top: 80px;
}

.print-panel {
  right: 20px;
  top: 80px;
}

.edit-toolbar.collapsed {
  transform: translateX(-265px);
  opacity: 0;
  pointer-events: none;
  box-shadow: none;
  border-color: transparent;
}

.print-panel.collapsed {
  transform: translateX(265px);
  opacity: 0;
  pointer-events: none;
  box-shadow: none;
  border-color: transparent;
}

.toggle-sidebar-btn {
  position: fixed;
  z-index: 1001;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(22, 27, 34, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 16px;
}

.toggle-sidebar-btn:hover {
  background: #21262d;
  border-color: var(--cyan);
  box-shadow: 0 0 15px var(--cyan);
  transform: scale(1.08);
}

.toggle-sidebar-btn.left-btn {
  left: 20px;
  top: 20px;
}

.toggle-sidebar-btn.right-btn {
  right: 20px;
  top: 20px;
}

.et-title, .pp-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--cyan);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.et-sep {
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.et-checks, .pp-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.et-sec-lbl, .pp-lbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  white-space: normal;
}

.et-sec-lbl:hover, .pp-lbl:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.04);
}

.et-sec-lbl input, .pp-chk {
  accent-color: var(--cyan);
  cursor: pointer;
  margin: 0;
}

.et-sec-lbl.active, .pp-lbl.sel {
  color: #ffffff;
  background: rgba(0, 197, 227, 0.08);
  border-color: rgba(0, 197, 227, 0.15);
}

.et-btn, .pp-btn {
  background: #161b22;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  transition: all 0.15s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.et-btn:hover, .pp-btn:hover {
  background: #21262d;
  border-color: var(--text-muted);
}

.et-btn-edit.on {
  background: var(--cyan);
  border-color: var(--cyan);
  color: #000000;
  box-shadow: 0 0 12px rgba(0, 197, 227, 0.3);
}

.pp-btn-pdf {
  background: linear-gradient(135deg, var(--cyan) 0%, #0078d4 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 197, 227, 0.2);
}

.pp-btn-pdf:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 197, 227, 0.3);
  filter: brightness(1.1);
}

.et-btn-close, .pp-btn-x {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  padding: 0;
  transition: all 0.15s ease;
}

.et-btn-close:hover, .pp-btn-x:hover {
  color: #ffffff;
  background: var(--rojo);
  border-color: var(--rojo);
}

/* EDIT MODE CONTENTEDITABLE STYLING */
body.edit-mode [contenteditable="true"] {
  outline: 2px dashed var(--cyan);
  outline-offset: 2px;
  background: rgba(0, 197, 227, 0.03);
  border-radius: 4px;
}

/* PIE STYLING */
.pie {
  text-align: center;
  padding: 32px 0;
  margin-top: 40px;
  border-top: 1px solid var(--border);
}

.pie p {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* PRINT MEDIA OVERRIDES */
@media print {
  :root {
    --bg: #ffffff;
    --card-bg: #ffffff;
    --border: #d0d7de;
    --text: #0f172a;
    --text-muted: #475569;
    --cyan: #0284c7;
    --verde: #16a34a;
    --amarillo: #d97706;
    --rojo: #dc2626;
  }
  
  body {
    background: #ffffff !important;
    color: #0f172a !important;
    font-size: 11px !important;
  }
  
  .container {
    padding: 0 !important;
    max-width: 100% !important;
  }
  
  .header {
    background: transparent !important;
    border-bottom: 2px solid #0f172a !important;
    padding: 16px 0 !important;
    box-shadow: none !important;
    margin: 0 0 20px 0 !important;
    max-width: 100% !important;
  }
  
  .header h1 {
    color: #0f172a !important;
    font-size: 20px !important;
  }
  
  .header .meta {
    border-top-color: #d0d7de !important;
  }
  
  .header .meta span, .header .meta strong {
    color: #0f172a !important;
  }
  
  .seccion {
    border: 1px solid #cbd5e1 !important;
    background: #ffffff !important;
    padding: 16px !important;
    box-shadow: none !important;
    margin-bottom: 20px !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  
  .seccion h2 {
    color: #0f172a !important;
    border-bottom-color: #d0d7de !important;
    font-size: 14px !important;
    margin-bottom: 12px !important;
    padding-bottom: 8px !important;
  }
  
  .exec-grid {
    gap: 12px !important;
  }
  
  .exec-card {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    border-top-width: 3px !important;
    padding: 10px !important;
    box-shadow: none !important;
  }
  
  .exec-card .valor {
    font-size: 16px !important;
  }
  
  .exec-card.verde .valor { color: #16a34a !important; }
  .exec-card.rojo .valor { color: #dc2626 !important; }
  .exec-card.amarillo .valor { color: #d97706 !important; }
  
  .tren-flow {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    padding: 12px !important;
  }
  
  .tren-box {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    box-shadow: none !important;
    color: #0f172a !important;
    padding: 6px 10px !important;
  }
  
  .tren-box.ro { border-color: #d97706 !important; }
  .tren-box.vert { border-color: #16a34a !important; }
  
  .tab-bar, .edit-toolbar, .print-panel, .pp-btn, .pp-checks, .pp-title, .toggle-sidebar-btn {
    display: none !important;
  }
  
  /* Show all tab panels during printing */
  .tab-panel {
    display: block !important;
    page-break-after: auto !important;
    break-after: auto !important;
  }
  
  .param-grid {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  
  .param-card {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    padding: 12px !important;
  }
  
  .param-card h4 {
    color: #0f172a !important;
    margin-bottom: 10px !important;
  }
  
  th {
    background: #f8fafc !important;
    color: #0f172a !important;
    border-bottom: 2px solid #cbd5e1 !important;
    padding: 8px 10px !important;
  }
  
  td {
    color: #0f172a !important;
    border-bottom-color: #cbd5e1 !important;
    padding: 8px 10px !important;
  }
  
  .badge {
    background: transparent !important;
    border: 1px solid #cbd5e1 !important;
    color: #0f172a !important;
  }
  
  .badge.conforme { border-color: #16a34a !important; color: #16a34a !important; }
  .badge.critico { border-color: #dc2626 !important; color: #dc2626 !important; }
  .badge.alerta { border-color: #d97706 !important; color: #d97706 !important; }
  
  .alerta-box {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    padding: 12px !important;
  }
  
  .alerta-box.rojo { border-left-color: #dc2626 !important; }
  .alerta-box.amarillo { border-left-color: #d97706 !important; }
  .alerta-box.verde { border-left-color: #16a34a !important; }
  
  .alerta-box .content strong { color: #0f172a !important; }
  
  .rem-bar-wrap {
    background: #f1f5f9 !important;
    border: 1px solid #cbd5e1 !important;
  }
  
  .rem-bar.alta { background: #16a34a !important; }
  .rem-bar.media { background: #d97706 !important; }
  .rem-bar.baja { background: #dc2626 !important; }
  
  .evento {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    border-left-width: 3px !important;
    padding: 10px !important;
  }
  
  .evento.critico { border-left-color: #dc2626 !important; }
  .evento.alerta { border-left-color: #d97706 !important; }
  .evento.verde { border-left-color: #16a34a !important; }
  
  .evento-desc { color: #0f172a !important; }
  
  .costo-card {
    background: #ffffff !important;
    border-color: #cbd5e1 !important;
    padding: 10px !important;
  }
  
  .costo-card .val {
    color: #0f172a !important;
  }
  
  p, h3, tr {
    orphans: 3;
    widows: 3;
  }
  
  .sec-oculta {
    display: none !important;
  }

  .page-content {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
}
"""

_JS_TABS = """
function switchTab(id) {
  document.querySelectorAll('.tab-panel').forEach(function(p) {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  var panel = document.getElementById('tab-panel-' + id);
  var btn   = document.getElementById('tab-btn-'   + id);
  if (panel) { panel.style.display = 'block'; panel.classList.add('active'); }
  if (btn)   { btn.classList.add('active'); }
  try { sessionStorage.setItem('calidad-tab', id); } catch(e) {}
}
(function() {
  try {
    var saved = sessionStorage.getItem('calidad-tab');
    if (saved && document.getElementById('tab-panel-' + saved)) {
      switchTab(saved); return;
    }
  } catch(e) {}
  // Activar primer tab por defecto
  var first = document.querySelector('.tab-btn');
  if (first) {
    var id = first.id.replace('tab-btn-', '');
    switchTab(id);
  }
})();

// ── Panel de selección multi-parámetro para PDF ────────────────────────────

function ppToggle(sid, checked) {
  var lbl = document.getElementById('pp-lbl-' + sid);
  if (lbl) lbl.classList.toggle('sel', checked);
}

function ppSelectAll(checked) {
  document.querySelectorAll('.pp-chk').forEach(function(ch) {
    ch.checked = checked;
    ppToggle(ch.value, checked);
  });
}

function prepararPDF() {
  var checks = Array.from(document.querySelectorAll('.pp-chk:checked'));
  if (checks.length === 0) {
    alert('Selecciona al menos un parámetro para incluir en el PDF.');
    return;
  }
  var activePanel = document.querySelector('.tab-panel.active');
  var activeId    = activePanel ? activePanel.id.replace('tab-panel-', '') : null;
  var tabBar      = document.querySelector('.tab-bar');

  // Ocultar tab-bar; mostrar solo los paneles seleccionados
  if (tabBar) tabBar.style.display = 'none';
  document.querySelectorAll('.tab-panel').forEach(function(p) {
    p.style.display = 'none'; p.classList.remove('active');
  });
  checks.forEach(function(ch) {
    var panel = document.getElementById('tab-panel-' + ch.value);
    if (panel) { panel.style.display = 'block'; panel.classList.add('active'); }
  });

  // Restaurar estado después de que el diálogo cierre
  window.onafterprint = function() {
    if (tabBar) tabBar.style.display = '';
    if (activeId) {
      switchTab(activeId);
    } else {
      document.querySelectorAll('.tab-panel').forEach(function(p) {
        p.style.display = 'none'; p.classList.remove('active');
      });
    }
    window.onafterprint = null;
  };
  window.print();
}

// ── Toolbar de edición y toggle de secciones ──────────────────────────────

var _editMode = false;
var _EDITABLE_SEL = 'p, h3, td, .evento-desc, .alerta-box .content p, .stat-val, .exec-card .desc';

function etToggleEdit() {
  _editMode = !_editMode;
  var btn = document.getElementById('et-edit-btn');
  if (_editMode) {
    document.body.classList.add('edit-mode');
    document.querySelectorAll(_EDITABLE_SEL).forEach(function(el) {
      el.setAttribute('contenteditable', 'true');
    });
    if (btn) { btn.textContent = '✏️ Edición ON'; btn.classList.add('on'); }
  } else {
    document.body.classList.remove('edit-mode');
    document.querySelectorAll('[contenteditable]').forEach(function(el) {
      el.removeAttribute('contenteditable');
    });
    if (btn) { btn.textContent = '✏️ Editar texto'; btn.classList.remove('on'); }
  }
}

function etToggleSec(sid, visible) {
  var sec = document.getElementById(sid);
  var lbl = document.getElementById('et-lbl-' + sid);
  if (sec) sec.classList.toggle('sec-oculta', !visible);
  if (lbl) lbl.classList.toggle('active', visible);
}

function toggleSidebar(type, forceCollapse) {
  var el = document.getElementById(type === 'edit' ? 'edit-toolbar' : 'print-panel');
  var btn = document.getElementById(type === 'edit' ? 'toggle-edit-btn' : 'toggle-print-btn');
  if (el) {
    if (forceCollapse === true) {
      el.classList.add('collapsed');
    } else if (forceCollapse === false) {
      el.classList.remove('collapsed');
    } else {
      el.classList.toggle('collapsed');
    }
    var isCollapsed = el.classList.contains('collapsed');
    if (btn) {
      if (type === 'edit') {
        btn.innerHTML = isCollapsed ? '🛠️' : '✕';
        btn.style.borderColor = isCollapsed ? '' : 'var(--cyan)';
      } else {
        btn.innerHTML = isCollapsed ? '📄' : '✕';
        btn.style.borderColor = isCollapsed ? '' : 'var(--cyan)';
      }
    }
    try {
      sessionStorage.setItem('calidad-sidebar-' + type, isCollapsed ? 'collapsed' : 'expanded');
    } catch(e) {}
    // Push content away from open panels
    var lOpen = !document.getElementById('edit-toolbar').classList.contains('collapsed');
    var rOpen = !document.getElementById('print-panel').classList.contains('collapsed');
    document.body.classList.toggle('lp-open', lOpen);
    document.body.classList.toggle('rp-open', rOpen);
  }
}

// ── Compartir informe ──────────────────────────────────────────────────────
function compartirInforme() {
  var visibles = [];
  document.querySelectorAll('.et-sec-chk').forEach(function(ch) {
    if (ch.checked) visibles.push(ch.value);
  });
  var url = new URL(window.location.href);
  url.searchParams.set('view', 'share');
  url.searchParams.set('sections', visibles.join(','));
  var shareUrl = url.toString();
  var btn = document.getElementById('btn-compartir');
  function showCopied() {
    if (btn) {
      var orig = btn.innerHTML;
      btn.innerHTML = '&#10003; Link copiado!';
      btn.style.background = 'rgba(22,163,74,0.25)';
      btn.style.borderColor = '#16a34a';
      btn.style.color = '#4ade80';
      setTimeout(function() {
        btn.innerHTML = orig;
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 2500);
    }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(showCopied).catch(function() {
      prompt('Copia este link para compartir:', shareUrl);
    });
  } else {
    prompt('Copia este link para compartir:', shareUrl);
  }
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
  // pp-chk: panel de parámetros para PDF
  document.querySelectorAll('.pp-chk').forEach(function(ch) {
    ppToggle(ch.value, ch.checked);
  });
  // et-sec-chk: checkboxes de secciones del toolbar
  document.querySelectorAll('.et-sec-chk').forEach(function(ch) {
    etToggleSec(ch.value, ch.checked);
  });

  // Init sidebars — always collapsed by default, user opens on demand
  ['edit', 'print'].forEach(function(type) {
    var saved = null;
    try { saved = sessionStorage.getItem('calidad-sidebar-' + type); } catch(e) {}
    var el = document.getElementById(type === 'edit' ? 'edit-toolbar' : 'print-panel');
    if (el) {
      var shouldCollapse = true;
      if (saved === 'expanded') shouldCollapse = false;
      toggleSidebar(type, shouldCollapse);
    }
  });
});
"""

COSTO_LIMITE_M3 = 3599.0

# Límites normativos Res. 0631/2015 para Vertimiento
LIMITES_NORM: dict[str, tuple] = {
    "pH":                    ("rango", 5.0,  9.0,   "u.pH"),
    "SST":                   ("max",   None, 75.0,  "mg/L"),
    "SST Gravimetrico":      ("max",   None, 75.0,  "mg/L"),
    "Temperatura":           ("max",   None, 40.0,  "°C"),
    "DQO":                   ("max",   None, 600.0, "mg/L"),
    "Cloruros":              ("max",   None, 1200.0,"mg/L"),
    "Solidos Sedimentables": ("max",   None, 3.0,   "mL/L"),
}

MESES_ES = {1:"Enero",2:"Febrero",3:"Marzo",4:"Abril",5:"Mayo",6:"Junio",
            7:"Julio",8:"Agosto",9:"Septiembre",10:"Octubre",11:"Noviembre",12:"Diciembre"}
TURNO_S  = {1:"T1", 2:"T2", 3:"T3", 0:"T0"}

# Mapa de secciones para el toolbar de edición (id → emoji + etiqueta)
SECCIONES_LABELS = [
    ("sec-resumen",      "📋 Resumen ejecutivo"),
    ("sec-tren",         "🔄 Tren de tratamiento"),
    ("sec-calidad",      "🔬 Calidad / parámetros"),
    ("sec-cumplimiento", "📊 Cumplimiento normativo"),
    ("sec-remociones",   "📉 Eficiencias de remoción"),
    ("sec-costos",       "💰 Costos operativos"),
    ("sec-eventos",      "⚠️ Eventos e incidencias"),
    ("sec-comparativo",  "📈 Comparativo histórico"),
    ("sec-conclusiones", "✅ Conclusiones"),
]


# ── Pequeños helpers HTML ─────────────────────────────────────────────────────

def _n(v, dec: int = 1, pre: str = "", suf: str = "") -> str:
    if v is None:
        return "—"
    try:
        return f"{pre}{float(v):,.{dec}f}{suf}"
    except Exception:
        return "—"


def _pct(v, dec: int = 1) -> str:
    if v is None:
        return "—"
    try:
        return f"{float(v):.{dec}f}%"
    except Exception:
        return "—"


def _badge(text: str, cls: str) -> str:
    return f'<span class="badge {cls}">{text}</span>'


def _kpi(label: str, valor_html: str, desc_html: str, color: str) -> str:
    return (
        f'<div class="exec-card {color}">'
        f'<div class="label">{label}</div>'
        f'<div class="valor">{valor_html}</div>'
        f'<div class="desc">{desc_html}</div>'
        f'</div>'
    )


def _stat(label: str, val_html: str, cls: str = "") -> str:
    return (
        f'<div class="stat-row">'
        f'<span class="stat-label">{label}</span>'
        f'<span class="stat-val {cls}">{val_html}</span>'
        f'</div>'
    )


def _alerta(tipo: str, icon: str, titulo: str, cuerpo: str) -> str:
    return (
        f'<div class="alerta-box {tipo}">'
        f'<div class="icon">{icon}</div>'
        f'<div class="content"><strong>{titulo}</strong><p>{cuerpo}</p></div>'
        f'</div>'
    )


def _check_ok(valor, param: str):
    """True = conforme, False = incumplimiento, None = sin límite normativo"""
    if valor is None:
        return None
    v = float(valor)
    lim = LIMITES_NORM.get(param)
    if not lim:
        return None
    tipo, mn, mx, _ = lim
    if tipo == "rango":
        return (mn <= v <= mx)
    return (v <= mx)


def _lim_label(param: str, lim_min_db, lim_max_db) -> str:
    lim = LIMITES_NORM.get(param)
    if lim:
        tipo, mn, mx, un = lim
        if tipo == "rango":
            return f"{mn}–{mx} {un}"
        return f"≤ {mx:.0f} {un}"
    if lim_max_db is not None:
        return f"≤ {float(lim_max_db):.2g}"
    if lim_min_db is not None:
        return f"≥ {float(lim_min_db):.2g}"
    return "Sin límite"


def _fmt_periodo(fi: str, ff: str) -> str:
    try:
        d0 = datetime.strptime(fi, "%Y-%m-%d")
        d1 = datetime.strptime(ff, "%Y-%m-%d")
        if d0.year == d1.year and d0.month == d1.month:
            return f"{d0.day} al {d1.day} de {MESES_ES[d0.month]} de {d0.year}"
        if d0.year == d1.year:
            return (f"{d0.day} de {MESES_ES[d0.month]} "
                    f"al {d1.day} de {MESES_ES[d1.month]} de {d0.year}")
        return f"{fi} al {ff}"
    except Exception:
        return f"{fi} al {ff}"


# ── Generador principal ───────────────────────────────────────────────────────

async def _generar_calidad_html(
    fi: str, ff: str, usuario: str, db: AsyncSession,
    view: str = "normal",
    sections: str = "",
) -> str:

    share_mode = (view == "share")
    visible_secs: set[str] | None = (
        set(s.strip() for s in sections.split(",") if s.strip()) if sections else None
    )

    # ── Q1: estadísticos por parámetro × unidad ───────────────────────────────
    rows_stats = (await db.execute(text("""
        SELECT p.nombre AS parametro, p.codigo AS p_cod, p.unidad AS p_unidad,
               u.nombre AS unidad_trat, u.codigo AS u_cod, u.orden_tren,
               p.limite_vertimiento_min AS lim_min,
               p.limite_vertimiento_max AS lim_max,
               COUNT(*) AS n,
               ROUND(MIN(mc.valor),  3) AS minimo,
               ROUND(MAX(mc.valor),  3) AS maximo,
               ROUND(AVG(mc.valor),  3) AS promedio,
               ROUND(IF(AVG(mc.valor)>0,
                        STDDEV(mc.valor)/AVG(mc.valor)*100,
                        NULL), 1)       AS cv_pct
        FROM medicion_calidad mc
        JOIN parametro_calidad   p ON p.id = mc.parametro_id
        JOIN unidad_tratamiento  u ON u.id = mc.unidad_id
        WHERE mc.fecha BETWEEN :fi AND :ff
          AND mc.valor IS NOT NULL AND mc.no_aplica = 0
        GROUP BY p.nombre, p.codigo, p.unidad,
                 u.nombre, u.codigo, u.orden_tren,
                 p.limite_vertimiento_min, p.limite_vertimiento_max
        ORDER BY p.nombre, u.orden_tren
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q2: mediciones en Vertimiento (cumplimiento) ──────────────────────────
    rows_vert = (await db.execute(text("""
        SELECT mc.fecha, mc.turno,
               p.nombre AS parametro, p.unidad AS p_unidad,
               mc.valor,
               p.limite_vertimiento_min AS lim_min,
               p.limite_vertimiento_max AS lim_max
        FROM medicion_calidad mc
        JOIN parametro_calidad   p ON p.id = mc.parametro_id
        JOIN unidad_tratamiento  u ON u.id = mc.unidad_id
        WHERE mc.fecha BETWEEN :fi AND :ff
          AND u.codigo = 'VERTIMIENTO'
          AND mc.valor IS NOT NULL AND mc.no_aplica = 0
        ORDER BY p.nombre, mc.fecha, mc.turno
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q3: remociones GEM ────────────────────────────────────────────────────
    rows_rem = (await db.execute(text("""
        SELECT parametro, parametro_codigo, parametro_unidad,
               COUNT(*)                                                       AS n_turnos,
               ROUND(AVG(pct_remocion_gem),       1)                          AS avg_gem,
               ROUND(MIN(pct_remocion_gem),       1)                          AS min_gem,
               ROUND(MAX(pct_remocion_gem),       1)                          AS max_gem,
               ROUND(AVG(pct_remocion_biologico), 1)                          AS avg_bio,
               ROUND(AVG(pct_remocion_global),    1)                          AS avg_global,
               SUM(CASE WHEN pct_remocion_gem >= 80 THEN 1 ELSE 0 END)        AS n_ge80,
               SUM(CASE WHEN pct_remocion_gem >= 60
                        AND pct_remocion_gem < 80  THEN 1 ELSE 0 END)         AS n_6079,
               SUM(CASE WHEN pct_remocion_gem < 60 THEN 1 ELSE 0 END)         AS n_lt60
        FROM v_calidad_remociones
        WHERE fecha BETWEEN :fi AND :ff
          AND pct_remocion_gem IS NOT NULL
        GROUP BY parametro, parametro_codigo, parametro_unidad
        ORDER BY parametro
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q4: costos diarios ────────────────────────────────────────────────────
    rows_cost = (await db.execute(text("""
        SELECT fecha,
               MAX(caudal_m3_dia)                                       AS caudal_m3,
               SUM(costo_dia)                                            AS costo_total,
               ROUND(SUM(costo_dia) / NULLIF(MAX(caudal_m3_dia), 0), 2) AS costo_m3
        FROM v_consumo_quimico_diario
        WHERE fecha BETWEEN :fi AND :ff
          AND caudal_m3_dia IS NOT NULL AND caudal_m3_dia > 0
        GROUP BY fecha
        ORDER BY fecha
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q5: químicos vs Plan Maestro ──────────────────────────────────────────
    rows_quim = (await db.execute(text("""
        SELECT producto_id, producto, sistema,
               ROUND(SUM(kg_real),              2) AS kg_real,
               ROUND(SUM(costo_real),           0) AS costo_real,
               ROUND(AVG(kg_por_m3_real),       4) AS kg_m3_real,
               ROUND(AVG(kg_por_m3_proyectado), 4) AS kg_m3_proy,
               ROUND(AVG(pesos_por_m3_real),    2) AS pesos_m3_real
        FROM v_quimico_real_vs_proyectado
        WHERE (anio*100+mes)
              BETWEEN (YEAR(:fi)*100+MONTH(:fi))
              AND     (YEAR(:ff)*100+MONTH(:ff))
        GROUP BY producto_id, producto, sistema
        ORDER BY sistema, producto_id
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q6: histórico 3 meses anteriores ─────────────────────────────────────
    rows_hist = (await db.execute(text("""
        SELECT anio, mes,
               MAX(caudal_real_m3)                                       AS caudal,
               ROUND(SUM(costo_real) / NULLIF(MAX(caudal_real_m3), 0), 2) AS pesos_m3
        FROM v_quimico_real_vs_proyectado
        WHERE (anio*100+mes) < (YEAR(:fi)*100+MONTH(:fi))
          AND caudal_real_m3 > 0
        GROUP BY anio, mes
        ORDER BY anio DESC, mes DESC
        LIMIT 3
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q7: picos temperatura Pulmón ─────────────────────────────────────────
    rows_temp = (await db.execute(text("""
        SELECT mc.fecha, mc.turno, ROUND(mc.valor, 1) AS valor
        FROM medicion_calidad mc
        JOIN parametro_calidad   p ON p.id = mc.parametro_id
        JOIN unidad_tratamiento  u ON u.id = mc.unidad_id
        WHERE mc.fecha BETWEEN :fi AND :ff
          AND u.codigo = 'PULMON'
          AND p.nombre = 'Temperatura'
          AND mc.valor > 40
          AND mc.no_aplica = 0
        ORDER BY mc.fecha, mc.turno
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ═══════════════════════════════════════════════════════════════════════════
    #  Procesar datos
    # ═══════════════════════════════════════════════════════════════════════════

    # Stats por parámetro
    p_stats: dict[str, list] = defaultdict(list)
    for r in rows_stats:
        p_stats[r["parametro"]].append(r)

    # Vertimiento por parámetro
    v_by_param: dict[str, list] = defaultdict(list)
    for r in rows_vert:
        v_by_param[r["parametro"]].append(r)

    # Compliance summary
    comp: dict[str, dict] = {}
    for param, rows in v_by_param.items():
        vals = [float(r["valor"]) for r in rows]
        fails = [r for r in rows if _check_ok(r["valor"], param) is False]
        comp[param] = {
            "n":       len(vals),
            "n_fail":  len(fails),
            "avg":     sum(vals) / len(vals) if vals else None,
            "max_":    max(vals) if vals else None,
            "min_":    min(vals) if vals else None,
            "lim_min": rows[0]["lim_min"],
            "lim_max": rows[0]["lim_max"],
            "unidad":  rows[0]["p_unidad"],
            "fails":   fails,
        }

    # Costos totales
    total_m3    = sum(float(r["caudal_m3"]   or 0) for r in rows_cost)
    total_cost  = sum(float(r["costo_total"] or 0) for r in rows_cost)
    costo_prom  = total_cost / total_m3 if total_m3 > 0 else 0
    dias_op     = len(rows_cost)
    excede_cost = [(r["fecha"], float(r["costo_m3"])) for r in rows_cost
                   if r["costo_m3"] and float(r["costo_m3"]) > COSTO_LIMITE_M3]

    # Parámetros con incumplimientos
    params_criticos = {p: d for p, d in comp.items() if d["n_fail"] > 0}

    # ═══════════════════════════════════════════════════════════════════════════
    #  Construir secciones HTML
    # ═══════════════════════════════════════════════════════════════════════════
    periodo_str = _fmt_periodo(fi, ff)
    generado    = datetime.now().strftime("%d/%m/%Y a las %H:%M")

    # ── HEADER ────────────────────────────────────────────────────────────────
    s_header = f"""
<div class="header">
  <h1>&#128202; Informe de Calidad de Agua &#8212; PTAR 2</h1>
  <div class="sub">Planta de Tratamiento de Agua Residual Textil &#8212; Bogot&#225; D.C.</div>
  <div class="meta">
    <span>&#128197; Per&#237;odo: <strong>{periodo_str}</strong></span>
    <span>&#128100; {usuario}</span>
    <span>&#128203; Generado: {generado}</span>
    <span>&#128194; Fuente: Sistema PTAR &#8212; PERMODA LTDA</span>
  </div>
</div>
"""

    # ── RESUMEN EJECUTIVO ─────────────────────────────────────────────────────
    kpis = []

    # pH
    ph_c = comp.get("pH")
    if ph_c:
        ok_pct = round((ph_c["n"] - ph_c["n_fail"]) / ph_c["n"] * 100) if ph_c["n"] else 0
        col = "verde" if ph_c["n_fail"] == 0 else "rojo"
        kpis.append(_kpi(
            "pH Vertimiento",
            f"{'&#10003; ' if ph_c['n_fail']==0 else '&#9888; '}{ok_pct}%",
            f"Rango 5&#8211;9 u.pH | N={ph_c['n']}<br>"
            f"Real: {_n(ph_c['min_'],2)}&#8211;{_n(ph_c['max_'],2)}",
            col,
        ))

    # SST
    sst_c = comp.get("SST") or comp.get("SST Gravimetrico")
    if sst_c:
        ok_pct = round((sst_c["n"] - sst_c["n_fail"]) / sst_c["n"] * 100) if sst_c["n"] else 0
        col = "verde" if sst_c["n_fail"] == 0 else ("rojo" if sst_c["n_fail"] > 1 else "amarillo")
        ev_txt = (f"{sst_c['n_fail']} incumplimiento(s)"
                  if sst_c["n_fail"] > 0 else f"Prom. {_n(sst_c['avg'],0)} mg/L | L&#237;mite: 75 mg/L")
        kpis.append(_kpi(
            "SST Vertimiento",
            f"{ok_pct}% cumple",
            f"{ev_txt}<br>N={sst_c['n']}",
            col,
        ))

    # Temperatura
    temp_c = comp.get("Temperatura")
    if temp_c:
        col = "verde" if temp_c["n_fail"] == 0 else "rojo"
        kpis.append(_kpi(
            "Temperatura Vert.",
            f"{'&#10003; 100%' if temp_c['n_fail']==0 else '&#9888; EXCEDE'}",
            f"M&#225;x. {_n(temp_c['max_'],1)} &#176;C (l&#237;m. &lt;40&#176;C)<br>N={temp_c['n']}",
            col,
        ))

    # Temperatura Pulmón
    if rows_temp:
        max_temp_p = max(float(r["valor"]) for r in rows_temp)
        kpis.append(_kpi(
            "Temperatura Pulm&#243;n",
            f"{len(rows_temp)} pico(s) &gt;40&#176;C",
            f"M&#225;x.: {_n(max_temp_p,1)} &#176;C<br>Sin impacto directo en vertimiento",
            "amarillo",
        ))

    # Costo promedio
    if rows_cost:
        col_cost = "verde" if costo_prom <= COSTO_LIMITE_M3 else "rojo"
        kpis.append(_kpi(
            "Costo GEM prom.",
            _n(costo_prom, 0, pre="$", suf="/m&#179;"),
            f"{_n(total_m3, 0)} m&#179; | {dias_op} d&#237;as op.<br>"
            f"L&#237;mite: ${COSTO_LIMITE_M3:,.0f}/m&#179;",
            col_cost,
        ))

    # Días sobre límite de costo
    if excede_cost:
        kpis.append(_kpi(
            "D&#237;as sobre l&#237;mite costo",
            f"{len(excede_cost)} d&#237;a(s)",
            "<br>".join(f"{r[0]}: {_n(r[1],0,pre='$')}/m&#179;" for r in excede_cost[:3]),
            "rojo",
        ))

    # Remociones GEM
    if rows_rem:
        best = max(rows_rem, key=lambda r: float(r["avg_gem"] or 0))
        kpis.append(_kpi(
            f"Remocion GEM — {best['parametro']}",
            _pct(best["avg_gem"]),
            f"N={best['n_turnos']} turnos<br>Min {_pct(best['min_gem'])} | Max {_pct(best['max_gem'])}",
            "verde" if float(best["avg_gem"] or 0) >= 80 else "amarillo",
        ))

    s_resumen = (
        '<div class="seccion" id="sec-resumen">'
        '<h2>&#128269; Resumen Ejecutivo</h2>'
        '<div class="exec-grid">'
        + "".join(kpis)
        + "</div></div>"
    )

    # ── TREN DE TRATAMIENTO ───────────────────────────────────────────────────
    s_tren = """
<div class="seccion" id="sec-tren">
  <h2>&#127981; Tren de Tratamiento PTAR 2</h2>
  <div class="tren-flow">
    <div class="tren-box">Tanque Pulm&#243;n</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box">Homogeneizador</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box">GEM (Coag-Floc)</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box">Reactor An&#243;xico</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box">MBBR</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box">MBR 1/2 (interno)</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box">MBR 1/2 (permeado)</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box ro">RO (&#250;nica etapa TDS)</div><div class="tren-arrow">&#8594;</div>
    <div class="tren-box vert">Vertimiento</div>
  </div>
  <p style="font-size:12px;color:#64748b;margin-top:8px;">
    &#8505;&#65039; El sistema biol&#243;gico no remueve sales. Solo la RO remueve TDS.
    Conductividad alta en vertimiento = normal (recibe rechazo RO). No genera alerta normativa.
  </p>
</div>
"""

    # ── SECCIÓN 1: CALIDAD POR PARÁMETRO — interfaz con pestañas ─────────────
    tab_btns   = []
    tab_panels = []
    param_ids  = []   # (param_display, sid) — para el print panel

    def _safe_id(name: str) -> str:
        """Convierte nombre de parámetro a ID HTML seguro."""
        import re
        return re.sub(r'[^A-Za-z0-9_-]', '_', name)

    for i, (param, stat_rows) in enumerate(sorted(p_stats.items())):
        sid      = _safe_id(param)
        is_first = (i == 0)
        param_ids.append((param, sid))
        c        = comp.get(param)
        lim_min  = stat_rows[0]["lim_min"]
        lim_max  = stat_rows[0]["lim_max"]
        p_unidad = stat_rows[0]["p_unidad"] or ""
        lim_txt  = _lim_label(param, lim_min, lim_max)
        n_total  = sum(int(r["n"] or 0) for r in stat_rows)

        # Badge de cumplimiento
        if c:
            pct_ok = round((c["n"] - c["n_fail"]) / c["n"] * 100) if c["n"] else 0
            if c["n_fail"] == 0:
                badge_h = _badge(f"&#10003; {pct_ok}% CONFORME", "conforme")
            else:
                badge_h = _badge(f"&#9888; {c['n_fail']} INCUMPLIMIENTO(S)", "critico")
        else:
            has_lim = lim_txt != "Sin límite"
            badge_h = _badge("Solo seguimiento", "neutro") if not has_lim else _badge("Sin datos vert.", "info")

        # ── Botón de tab ──────────────────────────────────────────────────────
        # Color del botón refleja estado: verde = conforme, rojo = incumplimiento
        btn_extra = ""
        if c and c["n_fail"] > 0:
            btn_extra = "style='border-color:#fca5a5;'"
        elif c and c["n_fail"] == 0 and LIMITES_NORM.get(param):
            btn_extra = "style='border-color:#86efac;'"

        active_cls = "active" if is_first else ""
        tab_btns.append(
            f'<button class="tab-btn {active_cls}" id="tab-btn-{sid}" '
            f'onclick="switchTab(\'{sid}\')" {btn_extra}>'
            f'{param} <span class="tab-n">{n_total}</span>'
            f'</button>'
        )

        # ── Alertas específicas ───────────────────────────────────────────────
        alertas = []
        if c and c["n_fail"] > 0:
            for f in c["fails"][:5]:
                fecha_f = str(f["fecha"])
                turno_f = TURNO_S.get(int(f["turno"] or 0), "")
                alertas.append(_alerta(
                    "rojo", "&#128680;",
                    f"Incumplimiento: {fecha_f} {turno_f} — {param} Vert. = {_n(f['valor'],3)} {p_unidad}",
                    f"L&#237;mite normativo: {lim_txt}",
                ))

        # ── Tabla de estadísticos ─────────────────────────────────────────────
        filas_tabla = "".join(
            f"<tr>"
            f"<td>{'<strong>' if r['u_cod']=='VERTIMIENTO' else ''}{r['unidad_trat']}{'</strong>' if r['u_cod']=='VERTIMIENTO' else ''}</td>"
            f"<td class='num'>{r['n']}</td>"
            f"<td class='num'>{_n(r['minimo'],3)}</td>"
            f"<td class='num'>{_n(r['promedio'],3)}</td>"
            f"<td class='num'>{_n(r['maximo'],3)}</td>"
            f"<td class='num'>{_pct(r['cv_pct'])}</td>"
            f"</tr>"
            for r in stat_rows
        )

        # ── Panel derecho: interpretación ─────────────────────────────────────
        interp_rows = []
        vert_row = next((r for r in stat_rows if r["u_cod"] == "VERTIMIENTO"), None)
        if vert_row and c:
            pct_ok  = round((c["n"] - c["n_fail"]) / c["n"] * 100) if c["n"] else 0
            cls_pct = "ok" if c["n_fail"] == 0 else "bad"
            interp_rows.append(_stat("Vertimiento — % cumplimiento", f"{pct_ok}% ({c['n']-c['n_fail']}/{c['n']})", cls_pct))
            interp_rows.append(_stat("Vertimiento — Promedio",       f"{_n(c['avg'],3)} {p_unidad}", ""))
            interp_rows.append(_stat("Vertimiento — M&#225;ximo",    f"{_n(c['max_'],3)} {p_unidad}", ""))
        if len(stat_rows) > 1:
            first = stat_rows[0]
            interp_rows.append(_stat(f"{first['unidad_trat']} — Promedio", f"{_n(first['promedio'],3)} {p_unidad}", ""))
            interp_rows.append(_stat(f"{first['unidad_trat']} — CV%",      f"{_pct(first['cv_pct'])}", "warn" if float(first["cv_pct"] or 0) > 30 else "ok"))

        interp_html = "".join(interp_rows) if interp_rows else "<p style='font-size:12px;color:#64748b;'>Sin mediciones en Vertimiento para este par&#225;metro.</p>"

        # ── Contenido del panel ───────────────────────────────────────────────
        panel_display = "block" if is_first else "none"
        panel_cls     = "tab-panel active" if is_first else "tab-panel"
        tab_panels.append(
            f'<div class="{panel_cls}" id="tab-panel-{sid}" style="display:{panel_display};">'
            f'<h3 style="margin-top:20px;">{param} &#8212; L&#237;mite: {lim_txt} {badge_h}</h3>'
            + "".join(alertas) +
            f'<div class="param-grid">'
            f'  <div class="param-card">'
            f'    <h4>&#128202; Estad&#237;sticos por punto de muestreo (N registros)</h4>'
            f'    <table>'
            f'      <tr><th>Punto</th><th class="num">N</th><th class="num">M&#237;n</th>'
            f'          <th class="num">Prom</th><th class="num">M&#225;x</th><th class="num">CV%</th></tr>'
            f'      {filas_tabla}'
            f'    </table>'
            f'  </div>'
            f'  <div class="param-card">'
            f'    <h4>&#128203; Interpretaci&#243;n</h4>'
            f'    {interp_html}'
            f'  </div>'
            f'</div>'
            f'</div>'
        )

    if tab_panels:
        tab_bar_html = '<div class="tab-bar">' + "".join(tab_btns) + "</div>"
        panels_html  = "".join(tab_panels)
    else:
        tab_bar_html = ""
        panels_html  = "<p>Sin registros en el per&#237;odo.</p>"

    s_calidad = (
        '<div class="seccion" id="sec-calidad">'
        f'<h2>&#128302; 1. Calidad de Agua &#8212; An&#225;lisis por Par&#225;metro ({periodo_str})</h2>'
        + tab_bar_html
        + panels_html
        + "</div>"
    )

    # ── TOOLBAR DE EDICIÓN — barra fija superior (edición + toggle secciones) ─
    sec_checks_html = "".join(
        f'<label class="et-sec-lbl" id="et-lbl-{sid}">'
        f'<input type="checkbox" class="et-sec-chk" value="{sid}" checked '
        f'onchange="etToggleSec(\'{sid}\', this.checked)"> {label}</label>'
        for sid, label in SECCIONES_LABELS
    )
    s_edit_toolbar = (
        '<button class="toggle-sidebar-btn left-btn" id="toggle-edit-btn" onclick="toggleSidebar(\'edit\')" title="Configurar Informe">🛠️</button>'
        '<div class="edit-toolbar" id="edit-toolbar">'
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">'
        '<span class="et-title">🛠️ Configurar</span>'
        '<button class="et-btn-close" onclick="toggleSidebar(\'edit\')" title="Ocultar panel">✕</button>'
        '</div>'
        '<button class="et-btn et-btn-edit" id="et-edit-btn" onclick="etToggleEdit()" style="width:100%; justify-content:center; margin-bottom:12px;">'
        '✏️ Editar texto</button>'
        '<div class="et-sep" style="height:1px; width:100%; margin:8px 0;"></div>'
        '<span class="et-title" style="margin-bottom:8px; display:block;">📄 Secciones:</span>'
        '<div class="et-checks" style="flex-direction:column; gap:8px;">' + sec_checks_html + '</div>'
        '<div class="et-sep" style="height:1px; width:100%; margin:8px 0;"></div>'
        '<button class="et-btn" id="btn-compartir" onclick="compartirInforme()" '
        'style="width:100%; justify-content:center; background:rgba(0,197,227,0.1);'
        'border-color:rgba(0,197,227,0.3); color:var(--cyan);">'
        '&#128279; Generar link</button>'
        '</div>'
    )

    # ── PRINT PANEL — barra flotante para selección de parámetros del PDF ────
    pp_checks_html = "".join(
        f'<label class="pp-lbl" id="pp-lbl-{sid}">'
        f'<input type="checkbox" class="pp-chk" value="{sid}" checked '
        f'onchange="ppToggle(\'{sid}\', this.checked)"> {param}'
        f'</label>'
        for param, sid in param_ids
    )
    s_print_panel = (
        '<button class="toggle-sidebar-btn right-btn" id="toggle-print-btn" onclick="toggleSidebar(\'print\')" title="Exportar PDF">📄</button>'
        '<div class="print-panel" id="print-panel">'
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">'
        '<span class="pp-title">📄 Exportar</span>'
        '<button class="pp-btn-x" onclick="toggleSidebar(\'print\')" title="Ocultar panel">✕</button>'
        '</div>'
        '<button class="pp-btn pp-btn-pdf" onclick="prepararPDF()" style="width:100%; justify-content:center; margin-bottom:12px;">'
        '📥 Generar PDF / Imprimir</button>'
        '<div class="et-sep" style="height:1px; width:100%; margin:8px 0;"></div>'
        '<span class="pp-title" style="margin-bottom:8px; display:block;">🧪 Parámetros PDF:</span>'
        '<div class="pp-checks" style="flex-direction:column; gap:8px; max-height:220px; overflow-y:auto; padding-right:4px;">' + pp_checks_html + '</div>'
        '<div style="display:flex; gap:8px; margin-top:12px;">'
        '<button class="pp-btn" onclick="ppSelectAll(true)" style="flex:1; justify-content:center; padding: 6px 10px;">Todos</button>'
        '<button class="pp-btn" onclick="ppSelectAll(false)" style="flex:1; justify-content:center; padding: 6px 10px;">Ninguno</button>'
        '</div>'
        '</div>'
    ) if param_ids else ""

    # ── SECCIÓN 2: CUMPLIMIENTO NORMATIVO ─────────────────────────────────────
    comp_filas = []
    # Parámetros con límites primero
    ordered = sorted(comp.keys(), key=lambda p: (0 if LIMITES_NORM.get(p) else 1, p))
    for param in ordered:
        d = comp[param]
        lim_txt = _lim_label(param, d["lim_min"], d["lim_max"])
        pct_ok = round((d["n"] - d["n_fail"]) / d["n"] * 100) if d["n"] else 0
        if d["n_fail"] == 0 and LIMITES_NORM.get(param):
            estado = _badge("&#10003; CONFORME", "conforme")
        elif d["n_fail"] == 0:
            estado = _badge("Sin l&#237;mite normativo", "neutro")
        elif d["n_fail"] <= 2:
            estado = _badge(f"&#9888; {d['n_fail']} EVENTO(S)", "critico")
        else:
            estado = _badge(f"&#10060; {d['n_fail']} INCUMPL.", "critico")
        comp_filas.append(
            f"<tr><td>{param}</td>"
            f"<td class='num'>{lim_txt}</td>"
            f"<td class='num'>{_n(d['avg'],3)}</td>"
            f"<td class='num'>{_n(d['max_'],3)}</td>"
            f"<td class='num'>{d['n']}</td>"
            f"<td class='num'>{d['n_fail']}</td>"
            f"<td>{estado}</td></tr>"
        )

    s_cumplimiento = (
        '<div class="seccion" id="sec-cumplimiento">'
        '<h2>&#9878;&#65039; 2. Resumen Cumplimiento Normativo &#8212; Resoluci&#243;n 0631/2015</h2>'
        + (
            "<table><tr>"
            "<th>Par&#225;metro</th><th class='num'>L&#237;mite</th>"
            "<th class='num'>Prom. Vert.</th><th class='num'>M&#225;x. Vert.</th>"
            "<th class='num'>N</th><th class='num'>Incumpl.</th><th>Estado</th>"
            "</tr>"
            + "".join(comp_filas)
            + "</table>"
            if comp_filas else "<p>Sin mediciones de Vertimiento en el per&#237;odo.</p>"
        )
        + "</div>"
    )

    # ── SECCIÓN 3: REMOCIONES ─────────────────────────────────────────────────
    rem_parts = []
    for r in rows_rem:
        avg = float(r["avg_gem"] or 0)
        bar_cls = "alta" if avg >= 80 else ("media" if avg >= 60 else "baja")
        bar_w   = min(100, max(0, avg))
        n_t     = int(r["n_turnos"] or 0)
        n_ge80  = int(r["n_ge80"]   or 0)
        n_6079  = int(r["n_6079"]   or 0)
        n_lt60  = int(r["n_lt60"]   or 0)
        rem_parts.append(f"""
<div style="margin-bottom:24px;">
  <h3>{r['parametro']} ({r['parametro_unidad'] or ''}) &#8212; Remoción GEM prom.: <span style="color:{'var(--verde)' if avg>=80 else 'var(--amarillo)'}">{_pct(r['avg_gem'])}</span></h3>
  <div style="margin:8px 0;">
    <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;"><span>{_pct(r['avg_gem'])}</span><span>n={n_t} turnos</span></div>
    <div class="rem-bar-wrap"><div class="rem-bar {bar_cls}" style="width:{bar_w:.0f}%"></div></div>
  </div>
  <table style="margin-top:12px;">
    <tr><th>Estad&#237;stico</th><th class="num">Valor</th><th>Estad&#237;stico</th><th class="num">Valor</th></tr>
    <tr><td>Remoción GEM prom.</td><td class="num">{_pct(r['avg_gem'])}</td>
        <td>Turnos &#8805; 80% (&#211;ptimo)</td><td class="num">{n_ge80}/{n_t} ({round(n_ge80/n_t*100) if n_t else 0}%)</td></tr>
    <tr><td>Remoción GEM m&#237;n.</td><td class="num">{_pct(r['min_gem'])}</td>
        <td>Turnos 60&#8211;79%</td><td class="num">{n_6079}/{n_t} ({round(n_6079/n_t*100) if n_t else 0}%)</td></tr>
    <tr><td>Remoción GEM m&#225;x.</td><td class="num">{_pct(r['max_gem'])}</td>
        <td>Turnos &lt; 60%</td><td class="num">{n_lt60}/{n_t} ({round(n_lt60/n_t*100) if n_t else 0}%)</td></tr>
    <tr><td>Remoción Biol&#243;gico prom.</td><td class="num">{_pct(r['avg_bio'])}</td>
        <td>Remoción Global prom.</td><td class="num">{_pct(r['avg_global'])}</td></tr>
  </table>
</div>
""")

    s_remociones = (
        '<div class="seccion" id="sec-remociones">'
        '<h2>&#9879;&#65039; 3. Eficiencia de Remoci&#243;n &#8212; Sistema GEM</h2>'
        + ("".join(rem_parts) if rem_parts else "<p>Sin datos de remoci&#243;n en el per&#237;odo.</p>")
        + "</div>"
    )

    # ── SECCIÓN 4: COSTOS ─────────────────────────────────────────────────────
    costo_kpis = ""
    if rows_cost:
        min_cost_row = min(rows_cost, key=lambda r: float(r["costo_m3"] or 9999))
        max_cost_row = max(rows_cost, key=lambda r: float(r["costo_m3"] or 0))
        col_prom = "verde" if costo_prom <= COSTO_LIMITE_M3 else "rojo"

        costo_kpis = f"""
<div class="costo-grid">
  <div class="costo-card"><div class="lbl">Volumen tratado</div>
    <div class="val">{_n(total_m3,0)} m&#179;</div><div class="sub">{dias_op} d&#237;as operativos</div></div>
  <div class="costo-card"><div class="lbl">Costo prom. GEM</div>
    <div class="val" style="color:var(--{col_prom})">{_n(costo_prom,0,pre='$',suf='/m&#179;')}</div>
    <div class="sub">L&#237;mite: ${COSTO_LIMITE_M3:,.0f}/m&#179;</div></div>
  <div class="costo-card"><div class="lbl">D&#237;as sobre l&#237;mite</div>
    <div class="val" style="color:var(--{'rojo' if excede_cost else 'verde'})">{len(excede_cost)} d&#237;a(s)</div>
    <div class="sub">{'&#10003; Todos dentro del l&#237;mite' if not excede_cost else f'{excede_cost[0][0]}: {_n(excede_cost[0][1],0,pre="$")}/m&#179;'}</div></div>
  <div class="costo-card"><div class="lbl">D&#237;a m&#225;s eficiente</div>
    <div class="val" style="color:var(--verde)">{_n(min_cost_row['costo_m3'],0,pre='$',suf='/m&#179;')}</div>
    <div class="sub">{str(min_cost_row['fecha'])}</div></div>
  <div class="costo-card"><div class="lbl">D&#237;a m&#225;s costoso</div>
    <div class="val" style="color:var(--{'rojo' if float(max_cost_row['costo_m3'] or 0)>COSTO_LIMITE_M3 else 'amarillo'})">{_n(max_cost_row['costo_m3'],0,pre='$',suf='/m&#179;')}</div>
    <div class="sub">{str(max_cost_row['fecha'])}</div></div>
</div>
"""

    if excede_cost:
        costo_kpis = _alerta(
            "rojo", "&#128680;",
            f"{len(excede_cost)} d&#237;a(s) exceden el indicador ${COSTO_LIMITE_M3:,.0f}/m&#179;",
            " | ".join(f"{r[0]}: ${r[1]:,.0f}/m&#179;" for r in excede_cost),
        ) + costo_kpis

    # Tabla diaria
    filas_cost = ""
    for r in rows_cost:
        c_m3 = float(r["costo_m3"] or 0)
        excede = c_m3 > COSTO_LIMITE_M3
        dif = c_m3 - COSTO_LIMITE_M3
        dif_str = f'+{_n(dif,0)}' if dif > 0 else _n(dif, 0)
        est = _badge("&#9888; EXCEDE", "critico") if excede else _badge("&#10003;", "conforme")
        cls_tr = ' class="excede"' if excede else ""
        filas_cost += (
            f"<tr{cls_tr}>"
            f"<td>{str(r['fecha'])}</td>"
            f"<td class='num'>{_n(r['caudal_m3'],0)}</td>"
            f"<td class='num'>{_n(r['costo_total'],0,pre='$')}</td>"
            f"<td class='num'>{_n(c_m3,0,pre='$',suf='/m&#179;')}</td>"
            f"<td class='num'>{dif_str}</td>"
            f"<td>{est}</td></tr>"
        )

    total_row = (
        f"<tr style='font-weight:700;background:#f8fafc;'>"
        f"<td><strong>TOTAL / PROMEDIO</strong></td>"
        f"<td class='num'><strong>{_n(total_m3,0)}</strong></td>"
        f"<td class='num'><strong>{_n(total_cost,0,pre='$')}</strong></td>"
        f"<td class='num'><strong>{_n(costo_prom,0,pre='$',suf='/m&#179;')}</strong></td>"
        f"<td class='num'><strong>{_n(costo_prom - COSTO_LIMITE_M3,0)}</strong></td>"
        f"<td>{_badge(f'{len(excede_cost)} excedencia(s)','alerta' if excede_cost else 'conforme')}</td>"
        f"</tr>"
    )

    tabla_cost = (
        "<table><tr>"
        "<th>Fecha</th><th class='num'>Caudal (m&#179;)</th><th class='num'>Costo total</th>"
        "<th class='num'>$/m&#179;</th><th class='num'>Dif. vs l&#237;mite</th><th>Estado</th>"
        "</tr>"
        + filas_cost + total_row + "</table>"
        if filas_cost else "<p>Sin datos de costos en el per&#237;odo.</p>"
    )

    # Tabla químicos vs Plan Maestro
    filas_quim = ""
    for r in rows_quim:
        kg_m3_r = float(r["kg_m3_real"] or 0)
        kg_m3_p = float(r["kg_m3_proy"] or 0)
        if kg_m3_p > 0:
            tendencia = (
                _badge("&#8595; Bajo proyecci&#243;n", "conforme")
                if kg_m3_r <= kg_m3_p
                else _badge("&#8593; Sobre proyecci&#243;n", "alerta")
            )
        else:
            tendencia = _badge("Sin proyecci&#243;n", "neutro")
        filas_quim += (
            f"<tr><td>{r['producto']}</td>"
            f"<td>{r['sistema']}</td>"
            f"<td class='num'>{_n(r['kg_real'],2)}</td>"
            f"<td class='num'>{_n(r['costo_real'],0,pre='$')}</td>"
            f"<td class='num'>{_n(r['kg_m3_real'],4)}</td>"
            f"<td class='num'>{_n(r['kg_m3_proy'],4) if r['kg_m3_proy'] else '&#8212;'}</td>"
            f"<td>{tendencia}</td></tr>"
        )

    tabla_quim = (
        "<h3 style='margin-top:20px;'>Consumo de Qu&#237;micos &#8212; Real vs. Plan Maestro</h3>"
        "<table><tr>"
        "<th>Qu&#237;mico</th><th>Sistema</th><th class='num'>Kg consumidos</th>"
        "<th class='num'>Costo real</th><th class='num'>kg/m&#179; real</th>"
        "<th class='num'>kg/m&#179; proyect.</th><th>Tendencia</th>"
        "</tr>" + filas_quim + "</table>"
        if filas_quim else ""
    )

    s_costos = (
        '<div class="seccion" id="sec-costos">'
        '<h2>&#128176; 4. Costos Operativos GEM</h2>'
        + costo_kpis
        + "<h3>Indicador $/m&#179; por d&#237;a operativo</h3>"
        + tabla_cost
        + tabla_quim
        + "</div>"
    )

    # ── SECCIÓN 5: EVENTOS ────────────────────────────────────────────────────
    eventos = []

    # Incumplimientos normativos
    for param, d in params_criticos.items():
        for f in d["fails"]:
            fecha_e = str(f["fecha"])
            turno_e = TURNO_S.get(int(f["turno"] or 0), "")
            eventos.append((
                "critico",
                f"{fecha_e} {turno_e}",
                f"&#128680; Incumplimiento normativo &#8212; {param} Vertimiento = {_n(f['valor'],3)} {d['unidad']}",
                f"L&#237;mite: {_lim_label(param, d['lim_min'], d['lim_max'])}. Verificar causa ra&#237;z.",
            ))

    # Días con costo excedente
    for fecha_e, cost_e in excede_cost:
        eventos.append((
            "critico",
            str(fecha_e),
            f"&#9888; Excedencia indicador costo: ${cost_e:,.0f}/m&#179; (l&#237;mite ${COSTO_LIMITE_M3:,.0f}/m&#179;)",
            f"Revisar dosificaci&#243;n de qu&#237;micos y caudal tratado ese d&#237;a.",
        ))

    # Picos temperatura Pulmón
    for r in rows_temp:
        eventos.append((
            "alerta",
            f"{str(r['fecha'])} {TURNO_S.get(int(r['turno'] or 0),'')}",
            f"&#127777;&#65039; Temperatura Pulm&#243;n = {_n(r['valor'],1)} &#176;C (umbral 40&#176;C)",
            "Sin impacto normativo directo. Monitorear fuente de calor en proceso textil.",
        ))

    if not eventos:
        eventos_html = _alerta(
            "verde", "&#10003;",
            "Sin eventos cr&#237;ticos en el per&#237;odo",
            "Todos los par&#225;metros normativos dentro de l&#237;mites y costos bajo control.",
        )
    else:
        eventos_html = '<div class="evento-list">' + "".join(
            f'<div class="evento {tipo}">'
            f'<div class="evento-fecha">{fecha}</div>'
            f'<div class="evento-desc">{desc}<small>{detalle}</small></div>'
            f'</div>'
            for tipo, fecha, desc, detalle in sorted(eventos, key=lambda e: (0 if e[0]=="critico" else 1, e[1]))
        ) + "</div>"

    s_eventos = (
        '<div class="seccion" id="sec-eventos">'
        '<h2>&#128203; 5. Eventos Operativos Relevantes</h2>'
        + eventos_html
        + "</div>"
    )

    # ── SECCIÓN 6: COMPARATIVO HISTÓRICO ──────────────────────────────────────
    hist_filas = ""
    for h in reversed(rows_hist):  # mostrar cronológico
        hist_filas += (
            f"<tr><td>{MESES_ES.get(int(h['mes']),'?')} {h['anio']}</td>"
            f"<td class='num'>{_n(h['caudal'],0)}</td>"
            f"<td class='num'>{_n(h['pesos_m3'],0,pre='$')}</td>"
            f"<td></td></tr>"
        )

    if rows_hist:
        hist_filas += (
            f"<tr style='font-weight:700;background:#f0fdf4;'>"
            f"<td><strong>Per&#237;odo actual</strong></td>"
            f"<td class='num'><strong>{_n(total_m3,0)}</strong></td>"
            f"<td class='num' style='color:var(--verde)'><strong>{_n(costo_prom,0,pre='$')}</strong></td>"
            f"<td>{_badge('Per&#237;odo actual','info')}</td></tr>"
        )

    # Comparativo químicos kg/m³
    quim_hist_filas = ""
    if rows_quim:
        for r in rows_quim:
            kg_r = float(r["kg_m3_real"] or 0)
            kg_p = float(r["kg_m3_proy"] or 0)
            if kg_p > 0:
                dif_pct = (kg_r - kg_p) / kg_p * 100
                tend = _badge(f"{'&#8595;' if dif_pct<=0 else '&#8593;'} {abs(dif_pct):.1f}%",
                              "conforme" if dif_pct <= 0 else "alerta")
            else:
                tend = _badge("Sin ref.", "neutro")
            quim_hist_filas += (
                f"<tr><td>{r['producto']}</td>"
                f"<td class='num'>{_n(r['kg_m3_real'],4)}</td>"
                f"<td class='num'>{_n(r['kg_m3_proy'],4) if r['kg_m3_proy'] else '&#8212;'}</td>"
                f"<td>{tend}</td></tr>"
            )

    s_comparativo = (
        '<div class="seccion" id="sec-comparativo">'
        '<h2>&#128200; 6. Comparativo Hist&#243;rico</h2>'
        + (
            "<table><tr><th>Per&#237;odo</th><th class='num'>Caudal (m&#179;)</th>"
            "<th class='num'>Costo $/m&#179;</th><th>Nota</th></tr>"
            + hist_filas + "</table>"
            if hist_filas else "<p>Sin datos hist&#243;ricos anteriores disponibles.</p>"
        )
        + (
            "<h3 style='margin-top:20px;'>Consumo espec&#237;fico kg/m&#179; vs. Plan Maestro &#8212; Per&#237;odo actual</h3>"
            "<table><tr><th>Qu&#237;mico</th><th class='num'>kg/m&#179; real</th>"
            "<th class='num'>kg/m&#179; proyect.</th><th>Desviaci&#243;n</th></tr>"
            + quim_hist_filas + "</table>"
            if quim_hist_filas else ""
        )
        + "</div>"
    )

    # ── SECCIÓN 7: CONCLUSIONES ───────────────────────────────────────────────
    total_incumpl = sum(d["n_fail"] for d in comp.values())
    n_excede_cost = len(excede_cost)
    n_temp_picos  = len(rows_temp)

    if total_incumpl == 0 and n_excede_cost == 0:
        estado_general = _alerta(
            "verde", "&#10003;",
            f"PTAR 2 opera con cumplimiento normativo completo en el per&#237;odo {periodo_str}",
            "Todos los par&#225;metros normativos dentro de l&#237;mites. Costos bajo el indicador. Sin eventos cr&#237;ticos.",
        )
    elif total_incumpl <= 2 and n_excede_cost <= 1:
        estado_general = _alerta(
            "amarillo", "&#9888;&#65039;",
            f"PTAR 2 opera con cumplimiento normativo, con alertas operativas a gestionar",
            f"{total_incumpl} incumplimiento(s) normativo(s) y {n_excede_cost} d&#237;a(s) sobre l&#237;mite de costo. Eventos aislados que requieren investigaci&#243;n.",
        )
    else:
        estado_general = _alerta(
            "rojo", "&#128680;",
            f"Se requiere atenci&#243;n inmediata: {total_incumpl} incumplimiento(s) normativo(s) detectados",
            f"Revisar causa ra&#237;z de todos los eventos. {n_excede_cost} d&#237;a(s) sobre l&#237;mite de costo.",
        )

    # Recomendaciones automáticas
    recomendaciones = []
    idx = 1
    for param, d in params_criticos.items():
        recomendaciones.append((
            str(idx), f"Investigar incumplimiento(s) de <strong>{param}</strong> en Vertimiento",
            f"{d['n_fail']} evento(s). Revisar bit&#225;cora, condiciones de operaci&#243;n y causa ra&#237;z.",
            _badge("ALTA", "critico"), "Inmediato",
        ))
        idx += 1

    for fecha_e, cost_e in excede_cost:
        recomendaciones.append((
            str(idx),
            f"Revisar dosificaci&#243;n qu&#237;mica el {str(fecha_e)}",
            f"Costo: ${cost_e:,.0f}/m&#179; (l&#237;m. ${COSTO_LIMITE_M3:,.0f}/m&#179;). Verificar proporcionalidad dosis vs. carga influente.",
            _badge("ALTA", "critico"), "Inmediato",
        ))
        idx += 1

    if n_temp_picos > 0:
        recomendaciones.append((
            str(idx),
            f"Monitorear temperatura Pulm&#243;n ({n_temp_picos} pico(s) &gt;40&#176;C)",
            "Identificar proceso textil generador de calor. Verificar si hay impacto en biolog&#237;a.",
            _badge("MEDIA", "alerta"), "Pr&#243;ximo mes",
        ))
        idx += 1

    # Verificar parámetros con baja frecuencia de muestreo en Vertimiento
    for param in ["DQO", "Cloruros", "Solidos Sedimentables"]:
        c = comp.get(param)
        if c and c["n"] < 5:
            recomendaciones.append((
                str(idx),
                f"Aumentar frecuencia de muestreo de <strong>{param}</strong> en Vertimiento",
                f"Solo {c['n']} medici&#243;n(es) en el per&#237;odo. Recomendado: m&#237;nimo 2&#8211;3 por semana.",
                _badge("MEDIA", "alerta"), "Pr&#243;ximo per&#237;odo",
            ))
            idx += 1

    filas_rec = "".join(
        f"<tr><td>{n}</td><td>{acc}</td><td>{det}</td><td>{prio}</td><td>{plazo}</td></tr>"
        for n, acc, det, prio, plazo in recomendaciones
    )

    # Tabla de cierre
    cierre_filas = []
    for param, d in comp.items():
        lim_txt = _lim_label(param, d["lim_min"], d["lim_max"])
        pct_ok  = round((d["n"] - d["n_fail"]) / d["n"] * 100) if d["n"] else 0
        tiene_lim = LIMITES_NORM.get(param) is not None or d["lim_max"] is not None
        resultado = f"{pct_ok}% &#8212; Prom. Vert. {_n(d['avg'],3)} {d['unidad']} | N={d['n']}"
        if d["n_fail"] == 0 and tiene_lim:
            estado_c = _badge("&#10003; CONFORME", "conforme")
        elif d["n_fail"] > 0:
            estado_c = _badge(f"&#9888; {d['n_fail']} EVENTO(S) &#8212; REVISAR", "critico")
        else:
            estado_c = _badge("Normal &#10003;", "neutro")
        cierre_filas.append(f"<tr><td>{param} &#8212; Res. 0631/2015 ({lim_txt})</td><td>{resultado}</td><td>{estado_c}</td></tr>")

    if rows_cost:
        col_ind = "verde" if costo_prom <= COSTO_LIMITE_M3 else "rojo"
        cierre_filas.append(
            f"<tr><td>Indicador Costo GEM (${COSTO_LIMITE_M3:,.0f}/m&#179;)</td>"
            f"<td>Prom. {_n(costo_prom,0,pre='$')}/m&#179; &#8212; {len(excede_cost)} d&#237;a(s) excedieron</td>"
            f"<td>{_badge('&#10003; BAJO L&#205;MITE','conforme') if costo_prom<=COSTO_LIMITE_M3 else _badge('&#9888; EXCEDENCIA PROMEDIO','critico')}</td></tr>"
        )

    for r in rows_rem:
        avg = float(r["avg_gem"] or 0)
        cierre_filas.append(
            f"<tr><td>Remoción GEM &#8212; {r['parametro']}</td>"
            f"<td>{_pct(r['avg_gem'])} promedio | N={r['n_turnos']} turnos</td>"
            f"<td>{_badge('&#10003; EFICIENTE','conforme') if avg>=80 else _badge('Por debajo de meta 80%','alerta')}</td></tr>"
        )

    s_conclusiones = (
        '<div class="seccion" id="sec-conclusiones">'
        '<h2>&#9989; 7. Conclusiones y Recomendaciones</h2>'
        + estado_general
        + (
            "<h3>Acciones Recomendadas</h3>"
            "<table><tr><th>#</th><th>Acci&#243;n</th><th>Detalle</th><th>Prioridad</th><th>Plazo</th></tr>"
            + filas_rec + "</table>"
            if recomendaciones else
            _alerta("verde", "&#10003;", "Sin acciones correctivas requeridas", "Per&#237;odo operado dentro de todos los par&#225;metros de control.")
        )
        + "<h3 style='margin-top:20px;'>7.2 Tabla de Cierre &#8212; Indicadores del Per&#237;odo</h3>"
        + "<table><tr><th>Criterio</th><th>Resultado</th><th>Estado</th></tr>"
        + "".join(cierre_filas) + "</table>"
        + "</div>"
    )

    # ── PIE ───────────────────────────────────────────────────────────────────
    s_pie = (
        f'<div class="pie">'
        f'<p><strong>INFORME DE CALIDAD DE AGUA &#8212; PTAR 2 | Per&#237;odo: {periodo_str}</strong></p>'
        f'<p style="margin-top:4px;">Preparado por: {usuario} | Generado: {generado}</p>'
        f'<p style="margin-top:4px;">Normativa: Resoluci&#243;n 0631 de 2015 | Fuente: Sistema PTAR &#8212; PERMODA LTDA</p>'
        f'</div>'
    )

    # ── Filtrar secciones en modo compartido ──────────────────────────────────
    def _vsec(html: str, sec_id: str) -> str:
        if visible_secs is None or sec_id in visible_secs:
            return html
        return ""

    s_share_banner = (
        '<div style="background:rgba(0,197,227,0.07);border-bottom:1px solid '
        'rgba(0,197,227,0.18);padding:10px 32px;font-size:12px;'
        'color:var(--text-muted);display:flex;align-items:center;gap:10px;">'
        '<span style="color:var(--cyan);font-size:16px;">&#128279;</span>'
        f'<span>Vista compartida &mdash; Solo lectura &nbsp;|&nbsp; '
        f'Per&#237;odo: {periodo_str}</span>'
        '</div>'
    ) if share_mode else ""

    # ── Ensamblar HTML completo ────────────────────────────────────────────────
    return (
        '<!DOCTYPE html><html lang="es"><head>'
        '<meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        f'<title>Informe Calidad &#8212; PTAR 2 | {periodo_str}</title>'
        f'<style>{_CSS}</style>'
        '</head><body>'
        + ("" if share_mode else s_edit_toolbar)
        + ("" if share_mode else s_print_panel)
        + '<div class="page-content">'
        + s_share_banner
        + s_header
        + '<div class="container">'
        + _vsec(s_resumen,      "sec-resumen")
        + _vsec(s_tren,         "sec-tren")
        + _vsec(s_calidad,      "sec-calidad")
        + _vsec(s_cumplimiento, "sec-cumplimiento")
        + _vsec(s_remociones,   "sec-remociones")
        + _vsec(s_costos,       "sec-costos")
        + _vsec(s_eventos,      "sec-eventos")
        + _vsec(s_comparativo,  "sec-comparativo")
        + _vsec(s_conclusiones, "sec-conclusiones")
        + s_pie
        + '</div>'
        + '</div>'
        + f'<script>{_JS_TABS}</script></body></html>'
    )


@router.get("/calidad-html")
async def generar_reporte_calidad_html(
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin:    str = Query(..., description="YYYY-MM-DD"),
    usuario:      str = Query("Encargado", description="Nombre del usuario que genera el informe"),
    view:         str = Query("normal", description="'normal' o 'share' para vista de solo lectura"),
    sections:     str = Query("", description="IDs de secciones separados por coma (solo en view=share)"),
    db: AsyncSession = Depends(get_db),
):
    html = await _generar_calidad_html(fecha_inicio, fecha_fin, usuario, db, view, sections)
    return Response(
        content=html,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'inline; filename="informe_calidad_{fecha_inicio}_{fecha_fin}.html"'
            )
        },
    )


# ══════════════════════════════════════════════════════════════════════════════
#  INFORME DASHBOARD HTML
# ══════════════════════════════════════════════════════════════════════════════

SECCIONES_DASH_LABELS = [
    ("sec-resumen",      "📋 Resumen ejecutivo"),
    ("sec-caudal",       "💧 Balance hídrico"),
    ("sec-reactivos",    "⚗️ Reactivos químicos"),
    ("sec-calidad",      "🔬 Calidad del agua"),
    ("sec-conclusiones", "✅ Conclusiones"),
]


async def _generar_dashboard_html(
    fi: str, ff: str, usuario: str, db: AsyncSession,
    view: str = "normal",
    sections: str = "",
) -> str:

    share_mode = (view == "share")
    visible_secs: set[str] | None = (
        set(s.strip() for s in sections.split(",") if s.strip()) if sections else None
    )

    # ── Q1: KPIs globales ────────────────────────────────────────────────────
    caudal_row = (await db.execute(text("""
        SELECT
            COALESCE(SUM(envio_th), 0)       AS total_m3,
            COALESCE(SUM(consumo_gem_m3), 0) AS gem_m3,
            COALESCE(SUM(entrada_ro1), 0)    AS ro_m3,
            COUNT(DISTINCT fecha)            AS dias_datos,
            COUNT(*)                         AS n_turnos
        FROM v_balance_hidrico
        WHERE fecha BETWEEN :fi AND :ff
    """), {"fi": fi, "ff": ff})).mappings().first()

    costo_row = (await db.execute(text("""
        SELECT
            COALESCE(SUM(costo_dia), 0) AS costo_total,
            COALESCE(SUM(kg_dia),    0) AS kg_total,
            COUNT(DISTINCT fecha)        AS dias_reactivos
        FROM v_consumo_quimico_diario
        WHERE fecha BETWEEN :fi AND :ff
    """), {"fi": fi, "ff": ff})).mappings().first()

    calidad_row = (await db.execute(text("""
        SELECT COALESCE(SUM(n_mediciones), 0) AS n_total
        FROM v_calidad_estadisticas
        WHERE (anio * 100 + mes)
              BETWEEN (YEAR(:fi) * 100 + MONTH(:fi))
              AND     (YEAR(:ff) * 100 + MONTH(:ff))
    """), {"fi": fi, "ff": ff})).mappings().first()

    # ── Q2: Caudal diario ────────────────────────────────────────────────────
    rows_caudal_d = (await db.execute(text("""
        SELECT
            fecha,
            ROUND(SUM(envio_th), 1)       AS envio_th,
            ROUND(SUM(consumo_gem_m3), 1) AS gem_m3,
            ROUND(SUM(entrada_ro1), 1)    AS ro_m3,
            COUNT(*)                       AS n_turnos
        FROM v_balance_hidrico
        WHERE fecha BETWEEN :fi AND :ff
        GROUP BY fecha
        ORDER BY fecha
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q3: Reactivos por químico ────────────────────────────────────────────
    rows_quim = (await db.execute(text("""
        SELECT
            producto_nombre             AS nombre,
            ROUND(SUM(kg_dia), 2)       AS kg_total,
            ROUND(SUM(costo_dia))       AS costo_total,
            COUNT(DISTINCT fecha)       AS dias
        FROM v_consumo_quimico_diario
        WHERE fecha BETWEEN :fi AND :ff
        GROUP BY producto_id, producto_nombre
        HAVING SUM(costo_dia) > 0
        ORDER BY SUM(costo_dia) DESC
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Q4: Calidad — top parámetros medidos ────────────────────────────────
    rows_cal = (await db.execute(text("""
        SELECT p.nombre AS parametro, p.unidad,
               COUNT(*)               AS n,
               ROUND(AVG(mc.valor),2) AS avg_v,
               ROUND(MIN(mc.valor),2) AS min_v,
               ROUND(MAX(mc.valor),2) AS max_v
        FROM medicion_calidad mc
        JOIN parametro_calidad p ON mc.parametro_id = p.id
        WHERE mc.fecha BETWEEN :fi AND :ff
        GROUP BY p.id, p.nombre, p.unidad
        ORDER BY COUNT(*) DESC
        LIMIT 12
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Helpers ──────────────────────────────────────────────────────────────
    def _fmt(v, dec=1):
        if v is None: return "—"
        return f"{float(v):,.{dec}f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def _cop(v):
        if v is None: return "—"
        return f"$ {float(v):,.0f}".replace(",", ".")

    total_m3    = float(caudal_row["total_m3"] or 0)
    gem_m3      = float(caudal_row["gem_m3"]   or 0)
    ro_m3       = float(caudal_row["ro_m3"]    or 0)
    dias_datos  = int(caudal_row["dias_datos"] or 1)
    n_turnos    = int(caudal_row["n_turnos"]   or 0)
    costo_total = float(costo_row["costo_total"] or 0)
    kg_total    = float(costo_row["kg_total"]    or 0)
    n_cal       = int(calidad_row["n_total"]     or 0)
    prom_diario = round(total_m3 / dias_datos, 1) if dias_datos > 0 else 0
    costo_m3    = round(costo_total / total_m3, 1) if total_m3 > 0 else 0

    # Período en texto
    d0 = date.fromisoformat(fi)
    d1 = date.fromisoformat(ff)
    meses_es = {1:"Enero",2:"Febrero",3:"Marzo",4:"Abril",5:"Mayo",6:"Junio",
                7:"Julio",8:"Agosto",9:"Septiembre",10:"Octubre",11:"Noviembre",12:"Diciembre"}
    if d0.month == d1.month and d0.year == d1.year:
        periodo_str = f"{d0.day}–{d1.day} de {meses_es[d0.month]} {d0.year}"
    else:
        periodo_str = f"{d0.day} {meses_es[d0.month]} – {d1.day} {meses_es[d1.month]} {d1.year}"

    # ── HEADER ────────────────────────────────────────────────────────────────
    tz_bog = ZoneInfo("America/Bogota")
    ahora  = datetime.now(tz=tz_bog).strftime("%d/%m/%Y a las %H:%M")

    s_header = f"""
<div class="header">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
    <div>
      <h1 style="margin:0; font-size:24px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
        &#128202; KPI Dashboard &#8212; PTAR 2
      </h1>
      <p style="margin:6px 0 0; font-size:13px; color:var(--text-muted);">
        Tratamiento de Agua Residual Textil &#8212; Bogot&#225; D.C.
      </p>
    </div>
    <div style="display:flex; flex-wrap:wrap; gap:10px; font-size:12px; color:var(--text-muted); align-items:center;">
      <span>&#128197; {periodo_str}</span>
      <span>&#128100; {usuario}</span>
      <span>&#128196; Generado: {ahora}</span>
    </div>
  </div>
</div>"""

    # ── SECCIÓN 1: RESUMEN EJECUTIVO ─────────────────────────────────────────
    def _kpi_card(icon, title, value, sub, color="var(--cyan)"):
        return (
            f'<div class="exec-card" style="border-top:3px solid {color};">'
            f'<div style="font-size:28px;margin-bottom:4px;">{icon}</div>'
            f'<div class="val" style="color:{color}; font-size:22px; font-weight:800;">{value}</div>'
            f'<div class="label" style="font-size:12px; font-weight:700; color:var(--text); margin:4px 0 2px;">{title}</div>'
            f'<div class="desc" style="font-size:11px; color:var(--text-muted);">{sub}</div>'
            f'</div>'
        )

    kpi_cards = (
        _kpi_card("💧", "Caudal Total Enviado", f"{_fmt(total_m3)} m³",
                  f"Prom. {_fmt(prom_diario)} m³/día · {dias_datos} días", "var(--cyan)")
        + _kpi_card("🟢", "GEM Tratado", f"{_fmt(gem_m3)} m³",
                    f"RO: {_fmt(ro_m3)} m³ · {n_turnos} turnos", "#3fb950")
        + _kpi_card("💰", "Costo Operativo", _cop(costo_total),
                    f"{_fmt(kg_total)} kg reactivos · {_cop(costo_m3)}/m³", "#d29922")
        + _kpi_card("🔬", "Mediciones Calidad", f"{n_cal:,}".replace(",", "."),
                    f"Período: {periodo_str}", "#1f6feb")
    )

    s_resumen = (
        '<div class="seccion" id="sec-resumen">'
        '<h2>&#128203; Resumen Ejecutivo</h2>'
        f'<div class="exec-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px;">'
        + kpi_cards
        + '</div>'
        '</div>'
    )

    # ── SECCIÓN 2: BALANCE HÍDRICO ────────────────────────────────────────────
    filas_caudal = ""
    total_env = total_gem = total_ro = 0.0
    for r in rows_caudal_d:
        ev  = float(r["envio_th"] or 0)
        gm  = float(r["gem_m3"]   or 0)
        rv  = float(r["ro_m3"]    or 0)
        total_env += ev; total_gem += gm; total_ro += rv
        filas_caudal += (
            f"<tr><td>{r['fecha']}</td>"
            f"<td class='num'>{_fmt(ev)}</td>"
            f"<td class='num'>{_fmt(gm)}</td>"
            f"<td class='num'>{_fmt(rv)}</td>"
            f"<td class='num'>{r['n_turnos']}</td></tr>"
        )

    tabla_caudal = (
        "<table>"
        "<tr><th>Fecha</th><th class='num'>Env&#237;o TH (m³)</th>"
        "<th class='num'>GEM (m³)</th><th class='num'>RO (m³)</th><th class='num'>Turnos</th></tr>"
        + filas_caudal
        + f"<tr style='font-weight:700; border-top:2px solid var(--cyan);'>"
          f"<td>TOTAL</td><td class='num'>{_fmt(total_env)}</td>"
          f"<td class='num'>{_fmt(total_gem)}</td><td class='num'>{_fmt(total_ro)}</td>"
          f"<td class='num'>{n_turnos}</td></tr>"
        + "</table>"
        if rows_caudal_d else "<p>Sin registros de caudal en el per&#237;odo.</p>"
    )

    s_caudal = (
        '<div class="seccion" id="sec-caudal">'
        '<h2>&#128167; Balance H&#237;drico</h2>'
        + tabla_caudal
        + '</div>'
    )

    # ── SECCIÓN 3: REACTIVOS ──────────────────────────────────────────────────
    filas_quim = ""
    for r in rows_quim:
        pct = round(float(r["costo_total"] or 0) / costo_total * 100) if costo_total > 0 else 0
        bar = f'<div style="height:4px;border-radius:2px;background:var(--cyan);width:{pct}%;margin-top:4px;"></div>'
        filas_quim += (
            f"<tr><td>{r['nombre']}</td>"
            f"<td class='num'>{_fmt(r['kg_total'],2)}</td>"
            f"<td class='num'>{_cop(r['costo_total'])}</td>"
            f"<td class='num'>{pct}%{bar}</td>"
            f"<td class='num'>{r['dias']}</td></tr>"
        )

    tabla_quim = (
        "<table>"
        "<tr><th>Producto</th><th class='num'>kg</th>"
        "<th class='num'>Costo</th><th class='num'>% del total</th><th class='num'>D&#237;as</th></tr>"
        + filas_quim
        + f"<tr style='font-weight:700; border-top:2px solid var(--cyan);'>"
          f"<td>TOTAL</td><td class='num'>{_fmt(kg_total,1)}</td>"
          f"<td class='num'>{_cop(costo_total)}</td><td class='num'>100%</td>"
          f"<td class='num'>{int(costo_row['dias_reactivos'] or 0)}</td></tr>"
        + "</table>"
        if rows_quim else "<p>Sin registros de reactivos en el per&#237;odo.</p>"
    )

    s_reactivos = (
        '<div class="seccion" id="sec-reactivos">'
        '<h2>&#9879;&#65039; Reactivos Qu&#237;micos</h2>'
        + tabla_quim
        + '</div>'
    )

    # ── SECCIÓN 4: CALIDAD ────────────────────────────────────────────────────
    filas_cal = ""
    for r in rows_cal:
        filas_cal += (
            f"<tr><td>{r['parametro']}</td><td>{r['unidad'] or '—'}</td>"
            f"<td class='num'>{r['n']}</td>"
            f"<td class='num'>{_fmt(r['avg_v'],3)}</td>"
            f"<td class='num'>{_fmt(r['min_v'],3)}</td>"
            f"<td class='num'>{_fmt(r['max_v'],3)}</td></tr>"
        )

    link_cal = (
        f'<p style="margin-top:16px; font-size:12px; color:var(--text-muted);">'
        f'&#128269; Para an&#225;lisis detallado por par&#225;metro, alertas y cumplimiento normativo, '
        f'consulta el <a href="/api/reportes/calidad-html?fecha_inicio={fi}&fecha_fin={ff}" '
        f'target="_blank" style="color:var(--cyan);">Informe de Calidad completo</a>.</p>'
    )

    tabla_cal = (
        "<table>"
        "<tr><th>Par&#225;metro</th><th>Unidad</th><th class='num'>N</th>"
        "<th class='num'>Promedio</th><th class='num'>M&#237;n.</th><th class='num'>M&#225;x.</th></tr>"
        + filas_cal
        + "</table>"
        if filas_cal else "<p>Sin mediciones de calidad en el per&#237;odo.</p>"
    )

    s_calidad = (
        '<div class="seccion" id="sec-calidad">'
        '<h2>&#128302; Calidad del Agua &#8212; Resumen</h2>'
        + tabla_cal
        + link_cal
        + '</div>'
    )

    # ── SECCIÓN 5: CONCLUSIONES ───────────────────────────────────────────────
    conclusiones = []
    if total_m3 > 0:
        conclusiones.append(
            f"Durante el período {periodo_str} se enviaron <strong>{_fmt(total_m3)} m³</strong> "
            f"de agua a producción textil, con un promedio de <strong>{_fmt(prom_diario)} m³/día</strong> "
            f"en {dias_datos} días con registro."
        )
    if gem_m3 > 0:
        pct_gem = round(gem_m3 / (gem_m3 + ro_m3) * 100) if (gem_m3 + ro_m3) > 0 else 0
        conclusiones.append(
            f"El sistema GEM trat&#243; <strong>{_fmt(gem_m3)} m³</strong> ({pct_gem}% del total tratado) "
            f"y el sistema RO process&#243; <strong>{_fmt(ro_m3)} m³</strong>."
        )
    if costo_total > 0:
        conclusiones.append(
            f"El costo operativo en reactivos qu&#237;micos fue de <strong>{_cop(costo_total)}</strong> "
            f"({_fmt(kg_total,1)} kg), equivalente a <strong>{_cop(costo_m3)}/m³</strong> tratado."
        )
    if n_cal > 0:
        conclusiones.append(
            f"Se registraron <strong>{n_cal:,} mediciones</strong> de calidad fisicoquímica.".replace(",", ".")
        )
    if not conclusiones:
        conclusiones.append("No se encontraron registros para el per&#237;odo seleccionado.")

    s_conclusiones = (
        '<div class="seccion" id="sec-conclusiones">'
        '<h2>&#10003; Conclusiones</h2>'
        + "".join(f"<p>{c}</p>" for c in conclusiones)
        + '</div>'
    )

    s_pie = (
        f'<div style="text-align:center; padding:24px 0 8px; font-size:11px; color:var(--text-muted);">'
        f'<p>KPI Dashboard &#8212; PTAR 2 | PERMODA LTDA | Per&#237;odo: {periodo_str}</p>'
        f'<p style="margin-top:4px;">Fuente: Sistema PTAR &#8212; PERMODA LTDA</p>'
        f'</div>'
    )

    # ── PANELES CONFIGURAR / EXPORTAR ────────────────────────────────────────
    sec_checks_html = "".join(
        f'<label class="et-sec-lbl" id="et-lbl-{sid}">'
        f'<input type="checkbox" class="et-sec-chk" value="{sid}" checked '
        f'onchange="etToggleSec(\'{sid}\', this.checked)"> {label}</label>'
        for sid, label in SECCIONES_DASH_LABELS
    )
    s_edit_toolbar = (
        '<button class="toggle-sidebar-btn left-btn" id="toggle-edit-btn" onclick="toggleSidebar(\'edit\')" title="Configurar Informe">🛠️</button>'
        '<div class="edit-toolbar" id="edit-toolbar">'
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">'
        '<span class="et-title">🛠️ Configurar</span>'
        '<button class="et-btn-close" onclick="toggleSidebar(\'edit\')" title="Ocultar panel">✕</button>'
        '</div>'
        '<button class="et-btn et-btn-edit" id="et-edit-btn" onclick="etToggleEdit()" style="width:100%; justify-content:center; margin-bottom:12px;">'
        '✏️ Editar texto</button>'
        '<div class="et-sep" style="height:1px; width:100%; margin:8px 0;"></div>'
        '<span class="et-title" style="margin-bottom:8px; display:block;">📄 Secciones:</span>'
        '<div class="et-checks" style="flex-direction:column; gap:8px;">' + sec_checks_html + '</div>'
        '<div class="et-sep" style="height:1px; width:100%; margin:8px 0;"></div>'
        '<button class="et-btn" id="btn-compartir" onclick="compartirInforme()" '
        'style="width:100%; justify-content:center; background:rgba(0,197,227,0.1);'
        'border-color:rgba(0,197,227,0.3); color:var(--cyan);">'
        '&#128279; Generar link</button>'
        '</div>'
    )

    s_print_panel = (
        '<button class="toggle-sidebar-btn right-btn" id="toggle-print-btn" onclick="toggleSidebar(\'print\')" title="Exportar PDF">📄</button>'
        '<div class="print-panel" id="print-panel">'
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">'
        '<span class="pp-title">📄 Exportar</span>'
        '<button class="pp-btn-x" onclick="toggleSidebar(\'print\')" title="Ocultar panel">✕</button>'
        '</div>'
        '<button class="pp-btn pp-btn-pdf" onclick="window.print()" style="width:100%; justify-content:center; margin-bottom:12px;">'
        '📥 Generar PDF / Imprimir</button>'
        '</div>'
    )

    # ── Filtrar secciones en modo compartido ──────────────────────────────────
    def _vsec(html: str, sec_id: str) -> str:
        if visible_secs is None or sec_id in visible_secs:
            return html
        return ""

    s_share_banner = (
        '<div style="background:rgba(0,197,227,0.07);border-bottom:1px solid '
        'rgba(0,197,227,0.18);padding:10px 32px;font-size:12px;'
        'color:var(--text-muted);display:flex;align-items:center;gap:10px;">'
        '<span style="color:var(--cyan);font-size:16px;">&#128279;</span>'
        f'<span>Vista compartida &mdash; Solo lectura &nbsp;|&nbsp; '
        f'Per&#237;odo: {periodo_str}</span>'
        '</div>'
    ) if share_mode else ""

    # ── Ensamblar HTML ────────────────────────────────────────────────────────
    return (
        '<!DOCTYPE html><html lang="es"><head>'
        '<meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        f'<title>KPI Dashboard &#8212; PTAR 2 | {periodo_str}</title>'
        f'<style>{_CSS}</style>'
        '</head><body>'
        + ("" if share_mode else s_edit_toolbar)
        + ("" if share_mode else s_print_panel)
        + '<div class="page-content">'
        + s_share_banner
        + s_header
        + '<div class="container">'
        + _vsec(s_resumen,      "sec-resumen")
        + _vsec(s_caudal,       "sec-caudal")
        + _vsec(s_reactivos,    "sec-reactivos")
        + _vsec(s_calidad,      "sec-calidad")
        + _vsec(s_conclusiones, "sec-conclusiones")
        + s_pie
        + '</div>'
        + '</div>'
        + f'<script>{_JS_TABS}</script></body></html>'
    )


@router.get("/dashboard-html")
async def generar_reporte_dashboard_html(
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin:    str = Query(..., description="YYYY-MM-DD"),
    usuario:      str = Query("Encargado", description="Nombre del usuario"),
    view:         str = Query("normal", description="'normal' o 'share'"),
    sections:     str = Query("", description="IDs de secciones separados por coma"),
    db: AsyncSession = Depends(get_db),
):
    html = await _generar_dashboard_html(fecha_inicio, fecha_fin, usuario, db, view, sections)
    return Response(
        content=html,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'inline; filename="dashboard_kpi_{fecha_inicio}_{fecha_fin}.html"'
            )
        },
    )
