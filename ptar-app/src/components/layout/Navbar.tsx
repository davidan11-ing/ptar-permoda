import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROLE_HOME, ROUTES } from '../../lib/routes';
import { useLocation } from 'react-router-dom';
import type { Role } from '../../models';

// Etiqueta corta para el badge del navbar
const ROLE_LABELS: Record<Role, string> = {
  operario:      'Registro',
  encargado:     'Analista',
  administrador: 'Visualizador',
};

// Nombre completo del rol (tooltip)
export const ROLE_LABELS_FULL: Record<Role, string> = {
  operario:      'Registro · Planta en Tiempo Real',
  encargado:     'Analista · Gestor de Datos',
  administrador: 'Visualizador Ejecutivo',
};

const ROLE_BADGE: Record<Role, string> = {
  operario: 'badge-operario',
  encargado: 'badge-encargado',
  administrador: 'badge-admin',
};

export default function Navbar() {
  const { currentUser, selectRole, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  if (!currentUser) return null;

  const handleRoleSwitch = (role: Role) => {
    selectRole(role);
    navigate(ROLE_HOME[role]);
  };

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
        <div className="navbar-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#00c5e3" strokeWidth="2"/>
            <path d="M7 16c2-4 5-6 7-6s5 2 7 6" stroke="#00c5e3" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 10v4" stroke="#00c5e3" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="14" cy="17" r="2" fill="#00c5e3"/>
          </svg>
        </div>
        <span className="navbar-title">PTAR <span className="navbar-subtitle">Sistema de Gestión</span></span>
      </Link>

      <nav className="navbar-nav">
        {currentUser.activeRole === 'operario' && (
          <>
            <Link to={ROUTES.OPERARIO_HOME}           className={`nav-link${location.pathname === ROUTES.OPERARIO_HOME ? ' active' : ''}`}>Inicio</Link>
            <Link to={ROUTES.FORMATO_CAUDALES}        className={`nav-link${location.pathname === ROUTES.FORMATO_CAUDALES ? ' active' : ''}`}>Caudales</Link>
            <Link to={ROUTES.FORMATO_REACTIVOS}       className={`nav-link${location.pathname === ROUTES.FORMATO_REACTIVOS ? ' active' : ''}`}>Reactivos</Link>
            <Link to={ROUTES.FORMATO_CALIDAD}         className={`nav-link${location.pathname === ROUTES.FORMATO_CALIDAD ? ' active' : ''}`}>Calidad</Link>
            <Link to={ROUTES.FORMATO_INCIDENCIAS}     className={`nav-link${location.pathname === ROUTES.FORMATO_INCIDENCIAS ? ' active' : ''}`}>Incidencias</Link>
            <Link to={ROUTES.FORMATO_CONDICIONES_OP}  className={`nav-link${location.pathname === ROUTES.FORMATO_CONDICIONES_OP ? ' active' : ''}`}>Condiciones</Link>
          </>
        )}
        {(currentUser.activeRole === 'encargado' || currentUser.activeRole === 'administrador') && (
          <>
            <Link
              to={ROLE_HOME[currentUser.activeRole]}
              className={`nav-link${location.pathname === ROLE_HOME[currentUser.activeRole] ? ' active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              to={ROUTES.ENCARGADO_CALIDAD}
              className={`nav-link${location.pathname.startsWith(ROUTES.ENCARGADO_CALIDAD) ? ' active' : ''}`}
            >
              Calidad
            </Link>
            <Link
              to={ROUTES.ENCARGADO_BALANCE}
              className={`nav-link${location.pathname.startsWith(ROUTES.ENCARGADO_BALANCE) ? ' active' : ''}`}
            >
              Balance
            </Link>
            <Link
              to={ROUTES.ENCARGADO_COSTOS}
              className={`nav-link${location.pathname.startsWith(ROUTES.ENCARGADO_COSTOS) ? ' active' : ''}`}
            >
              Costos
            </Link>
          </>
        )}
      </nav>

      <div className="navbar-user">
        {currentUser.roles.length > 1 && (
          <div className="role-switcher">
            {currentUser.roles.map(r => (
              <button
                key={r}
                className={`role-btn ${currentUser.activeRole === r ? 'active' : ''}`}
                onClick={() => handleRoleSwitch(r)}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        )}
        <span
          className={`role-badge ${ROLE_BADGE[currentUser.activeRole]}`}
          title={ROLE_LABELS_FULL[currentUser.activeRole]}
        >
          {ROLE_LABELS[currentUser.activeRole]}
        </span>
        <span className="user-name">{currentUser.nombre}</span>
        <button className="logout-btn" onClick={handleLogout}>Salir</button>
      </div>
    </header>
  );
}
