import { Link } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';

const FORMATOS = [
  {
    to: ROUTES.FORMATO_CAUDALES,
    title: 'Registro de Contadores',
    subtitle: 'Lecturas acumuladas de agua (m³) para balance hidrico.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#00c5e3" strokeWidth="1.5"/>
        <rect x="12" y="14" width="16" height="12" rx="2" stroke="#00c5e3" strokeWidth="1.5"/>
        <path d="M16 14v-3M24 14v-3" stroke="#00c5e3" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 20h4M15 23h6" stroke="#00c5e3" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="26" cy="22" r="2" fill="#00c5e3"/>
      </svg>
    ),
    fields: ['20 contadores fijos en orden', 'Lectura actual (m³)', 'Delta calculado automático', 'Validación de decremento'],
    color: '#00c5e3',
    num: 'F-01',
  },
  {
    to: ROUTES.FORMATO_REACTIVOS,
    title: 'Consumo Químico',
    subtitle: 'Registro de reactivos GEM, Osmosis (RO) y PTAP. Horómetro, volumen tratado y ppms.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#3fb950" strokeWidth="1.5"/>
        <rect x="15" y="8" width="10" height="4" rx="2" stroke="#3fb950" strokeWidth="1.5"/>
        <path d="M15 12l-4 18h18l-4-18" stroke="#3fb950" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 24h16" stroke="#3fb950" strokeWidth="1.5"/>
        <path d="M17 27v3M23 27v3" stroke="#3fb950" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    fields: ['GEM · RO · PTAP en un formulario', 'Horómetro y volumen tratado (GEM)', 'Nivel inicial → final (L calc)', 'Alerta automática ingreso de producto'],
    color: '#3fb950',
    num: 'F-02',
  },
  {
    to: ROUTES.FORMATO_INCIDENCIAS,
    title: 'Calidad de Agua',
    subtitle: 'Parámetros físico-químicos por unidad de tratamiento, turno a turno.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#d29922" strokeWidth="1.5"/>
        <path d="M20 10c0 0-8 7-8 13a8 8 0 0016 0c0-6-8-13-8-13z" stroke="#d29922" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M16 24a4 4 0 004-4" stroke="#d29922" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    fields: ['pH, TDS, Conductividad…', 'Valor turno anterior', 'Validaciones especiales', 'Obs. generales al inicio'],
    color: '#d29922',
    num: 'F-03',
  },
  {
    to: ROUTES.FORMATO_CONDICIONES_OP,
    title: 'Condiciones de Operación',
    subtitle: 'Parámetros operativos de los sistemas RO y MBR. En definición.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#8b949e" strokeWidth="1.5"/>
        <circle cx="20" cy="20" r="5" stroke="#8b949e" strokeWidth="1.5"/>
        <path d="M20 9v4M20 27v4M9 20h4M27 20h4" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12.9 12.9l2.8 2.8M24.3 24.3l2.8 2.8M12.9 27.1l2.8-2.8M24.3 15.7l2.8-2.8" stroke="#8b949e" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    fields: ['Condiciones sistema RO', 'Condiciones sistema MBR', 'Próximamente disponible', ''],
    color: '#8b949e',
    num: 'F-05',
  },
];

export default function OperarioHome() {
  const { currentUser } = useAuth();

  return (
    <div className="operario-home">
      <div className="op-welcome">
        <h1 className="op-title">Hola! Bienvenido, <span>{currentUser?.nombre}</span></h1>
        <p className="op-subtitle">Selecciona el formato a diligenciar para este turno</p>
        <div className="op-date">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' — '}
          {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="formato-grid">
        {FORMATOS.map(f => (
          <Link
            key={f.to}
            to={f.to}
            className="formato-grid-card"
            style={{ '--card-color': f.color } as React.CSSProperties}
          >
            <div className="fgc-top">
              <div className="fgc-icon">{f.icon}</div>
              <span className="fgc-num" style={{ background: f.color }}>{f.num}</span>
            </div>
            <h2 className="fgc-title">{f.title}</h2>
            <p className="fgc-subtitle">{f.subtitle}</p>
            <ul className="fgc-fields">
              {f.fields.map(field => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <div className="fgc-footer">
              <span className="fgc-action">Diligenciar</span>
              <span className="fgc-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="op-stats-row">
        <div className="op-stat-card">
          <span className="op-stat-num">4</span>
          <span className="op-stat-label">Formatos disponibles</span>
        </div>
        <div className="op-stat-card">
          <span className="op-stat-num op-stat-pending">0</span>
          <span className="op-stat-label">Pendientes hoy</span>
        </div>
        <div className="op-stat-card">
          <span className="op-stat-num op-stat-ok">0</span>
          <span className="op-stat-label">Enviados hoy</span>
        </div>
      </div>
    </div>
  );
}
