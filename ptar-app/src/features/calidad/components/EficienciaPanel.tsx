import type { EficienciaRow } from '../hooks/useCalidadData';

interface Props {
  eficiencia: EficienciaRow[];
}

export default function EficienciaPanel({ eficiencia }: Props) {
  if (eficiencia.length === 0) {
    return <div className="cal-empty">Sin datos de eficiencia para el período seleccionado</div>;
  }

  return (
    <div className="cal-eficiencia">
      {eficiencia.map(row => {
        const pct = row.pct;
        const isPositive = pct >= 0;
        const barWidth = Math.min(Math.abs(pct), 100);

        return (
          <div key={row.etapa} className="cal-ef-row">
            <div className="cal-ef-label">
              <span className="cal-ef-etapa">{row.etapa}</span>
              <span className="cal-ef-route">
                {row.entrada_label} → {row.salida_label}
              </span>
            </div>
            <div className="cal-ef-bar-wrap">
              <div
                className="cal-ef-bar"
                style={{
                  width: `${barWidth}%`,
                  background: isPositive ? '#238636' : '#da3633',
                }}
              />
              <span
                className="cal-ef-pct"
                style={{ color: isPositive ? '#3fb950' : '#f85149' }}
              >
                {isPositive ? '+' : ''}{pct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
