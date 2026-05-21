from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from datetime import date, timedelta

router = APIRouter()


@router.get("/kpis")
async def get_kpis(
    fecha_inicio: str | None = Query(None, description="YYYY-MM-DD; por defecto: últimos 30 días"),
    fecha_fin: str | None = Query(None, description="YYYY-MM-DD; por defecto: hoy"),
    db: AsyncSession = Depends(get_db),
):
    hoy = date.today().isoformat()
    fi  = fecha_inicio or (date.today() - timedelta(days=30)).isoformat()
    ff  = fecha_fin or hoy

    # ── Caudal — v_balance_hidrico (envio_th = agua total enviada a producción) ─
    caudal_row = (await db.execute(text("""
        SELECT
            COALESCE(SUM(envio_th), 0)  AS total_m3,
            COUNT(DISTINCT fecha)        AS dias_con_datos,
            COUNT(*)                     AS n_lecturas
        FROM v_balance_hidrico
        WHERE fecha BETWEEN :fi AND :ff
    """), {"fi": fi, "ff": ff})).mappings().first()

    # ── Químicos — v_consumo_quimico_diario (10 productos × día) ────────────────
    costo_row = (await db.execute(text("""
        SELECT
            COALESCE(SUM(costo_dia), 0)  AS costo_total,
            COALESCE(SUM(kg_dia),    0)  AS kg_total,
            COUNT(DISTINCT fecha)         AS n_registros
        FROM v_consumo_quimico_diario
        WHERE fecha BETWEEN :fi AND :ff
    """), {"fi": fi, "ff": ff})).mappings().first()

    # ── Top 5 químicos por costo — agrupado por producto ────────────────────────
    quimicos_rows = (await db.execute(text("""
        SELECT
            producto_nombre        AS nombre_quimico,
            'KG'                   AS unidad,
            ROUND(SUM(kg_dia), 2)  AS kg_total,
            ROUND(SUM(costo_dia))  AS costo_total
        FROM v_consumo_quimico_diario
        WHERE fecha BETWEEN :fi AND :ff
        GROUP BY producto_id, producto_nombre
        HAVING SUM(costo_dia) > 0
        ORDER BY SUM(costo_dia) DESC
        LIMIT 5
    """), {"fi": fi, "ff": ff})).mappings().all()

    # ── Calidad — total de mediciones en el período ──────────────────────────────
    calidad_row = (await db.execute(text("""
        SELECT COALESCE(SUM(n_mediciones), 0) AS n_total
        FROM v_calidad_estadisticas
        WHERE (anio * 100 + mes)
              BETWEEN (YEAR(:fi) * 100 + MONTH(:fi))
              AND     (YEAR(:ff) * 100 + MONTH(:ff))
    """), {"fi": fi, "ff": ff})).mappings().first()

    # ── Caudal GEM vs RO últimos 7 días — v_balance_hidrico ─────────────────────
    fi7 = (date.today() - timedelta(days=7)).isoformat()
    por_tipo_rows = (await db.execute(text("""
        SELECT 'GEM' AS tipo_agua,
               ROUND(COALESCE(SUM(consumo_gem_m3), 0), 1) AS m3_total
        FROM v_balance_hidrico
        WHERE fecha BETWEEN :fi7 AND :ff
        UNION ALL
        SELECT 'RO',
               ROUND(COALESCE(SUM(entrada_ro1), 0), 1)
        FROM v_balance_hidrico
        WHERE fecha BETWEEN :fi7 AND :ff
    """), {"fi7": fi7, "ff": ff})).mappings().all()

    total_m3 = float(caudal_row["total_m3"] or 0)
    dias     = int(caudal_row["dias_con_datos"] or 1)

    return {
        "periodo": {"inicio": fi, "fin": ff},
        "caudal": {
            "total_m3": total_m3,
            "promedio_diario_m3": round(total_m3 / dias, 1) if dias > 0 else 0,
            "dias_con_datos": dias,
            "n_lecturas": int(caudal_row["n_lecturas"] or 0),
        },
        "reactivos": {
            "costo_total": float(costo_row["costo_total"] or 0),
            "kg_total": float(costo_row["kg_total"] or 0),
            "n_registros": int(costo_row["n_registros"] or 0),
            "por_quimico": [dict(r) for r in quimicos_rows],
        },
        "calidad": {
            "n_total": int(calidad_row["n_total"] or 0),
        },
        "caudal_por_tipo": [dict(r) for r in por_tipo_rows],
    }
