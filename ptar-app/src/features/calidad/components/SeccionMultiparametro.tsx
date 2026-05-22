import TurnoAturnoChart from './TurnoAturnoChart';
import DispersionChart  from './DispersionChart';
import type { RawRow }        from '../hooks/useCalidadData';
import type { DispersionRow } from '../hooks/useDispersionData';

interface Props {
  rawData:        RawRow[];
  dispersionData: DispersionRow[];
  unidad_medida:  string;
}

const GRUPOS: Record<string, string[]> = {
  fases: [
    'Tanque Pulmon',
    'Tanque Homogeneizador',
    'GEM Salida',
  ],
  biologico: [
    'Reactor Anoxico',
    'Reactor MBBR',
    'MBR 1 Interno',
    'MBR 2 Interno',
    'MBR 1 Permeado',
    'MBR 2 Permeado',
  ],
  osmosis: [
    'RO 1 Etapa 1',
    'RO 1 Etapa 2',
    'RO 1 Compuesta',
    'RO 2 Permeado',
    'RO Rechazo',
  ],
};

const GRUPO_LABELS: Record<string, string> = {
  fases:     'Fases de Pretratamiento',
  biologico: 'Sistema Biológico (MBR)',
  osmosis:   'Ósmosis Inversa (RO)',
};

const GRUPO_TIPO: Record<string, 'line' | 'bar'> = {
  fases:     'line',
  biologico: 'bar',
  osmosis:   'line',
};

export default function SeccionMultiparametro({ rawData, dispersionData, unidad_medida }: Props) {
  // Verificar qué unidades tienen datos
  const unidadesConDatos = new Set(rawData.map(r => r.unidad_tratamiento));

  return (
    <>
      {Object.entries(GRUPOS).map(([grupo, unidades]) => {
        const unidadesActivas = unidades.filter(u => unidadesConDatos.has(u));
        if (unidadesActivas.length === 0) return null;

        const dataGrupo = rawData.filter(r => unidades.includes(r.unidad_tratamiento));

        // Para dispersión: usa la primera unidad con datos disponibles
        const primeraUnidad = unidadesActivas[0];

        return (
          <section key={grupo} className="cal-section">
            <div className="cal-section-header">
              <h2 className="cal-section-title">Multiparámetro — {GRUPO_LABELS[grupo]}</h2>
              <span className="cal-section-meta">{unidadesActivas.join(' · ')}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
                <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                  Turno a turno — todas las unidades
                </div>
                <TurnoAturnoChart
                  data={dataGrupo}
                  unidades={unidadesActivas}
                  unidad_medida={unidad_medida}
                  tipo={GRUPO_TIPO[grupo]}
                />
              </div>
              <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
                <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                  Dispersión (mín/prom/máx) — {primeraUnidad}
                </div>
                <DispersionChart
                  data={dispersionData}
                  unidadFiltrada={primeraUnidad}
                  unidad_medida={unidad_medida}
                />
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
