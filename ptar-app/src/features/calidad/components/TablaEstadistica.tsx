// Tabla estadística de mínimo, promedio y máximo por unidad de tratamiento
import type { SummaryRow } from '../hooks/useCalidadData';

interface Props {
  summary: SummaryRow[];
  unidad_medida: string;
}

// Filas por unidad con punto de color identificador
export default function TablaEstadistica({ summary, unidad_medida }: Props) {
  if (summary.length === 0) {
    return <div className="cal-empty">Sin datos para el período seleccionado</div>;
  }

  return (
    <div className="cal-tabla-wrap">
      <table className="cal-tabla">
        <thead>
          <tr>
            <th>Unidad de tratamiento</th>
            <th>Mín ({unidad_medida})</th>
            <th>Prom ({unidad_medida})</th>
            <th>Máx ({unidad_medida})</th>
            <th>N mediciones</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(row => (
            <tr key={row.unidad}>
              <td>
                <span
                  className="cal-tabla-dot"
                  style={{ background: row.color }}
                />
                {row.unidad}
              </td>
              <td className="cal-tabla-num">{row.min}</td>
              <td className="cal-tabla-num cal-tabla-avg">{row.avg}</td>
              <td className="cal-tabla-num">{row.max}</td>
              <td className="cal-tabla-num">{row.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
