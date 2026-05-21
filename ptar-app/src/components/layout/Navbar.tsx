import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROLE_HOME, ROUTES } from '../../lib/routes';
import { useLocation } from 'react-router-dom';
import type { Role } from '../../models';

const ROLE_LABELS: Record<Role, string> = {
  operario: 'Operario',
  encargado: 'Encargado',
  administrador: 'Administrador',
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
      <div className="navbar-brand">
        <div className="navbar-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#00c5e3" strokeWidth="2"/>
            <path d="M7 16c2-4 5-6 7-6s5 2 7 6" stroke="#00c5e3" strokeWidth="2" strokeLinecap="round"/>
            <path d="M14 10v4" stroke="#00c5e3" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="14" cy="17" r="2" fill="#00c5e3"/>
          </svg>
        </div>
        <span className="navbar-title">PTAR <span className="navbar-subtitle">Sistema de Gestión</span></span>
      </div>

      <nav className="navbar-nav">
        {currentUser.activeRole === 'operario' && (
          <>
            <Link to="/operario" className="nav-link">Inicio</Link>
            <Link to="/operario/formato/caudales" className="nav-link">Caudales</Link>
            <Link to="/operario/formato/reactivos" className="nav-link">Reactivos</Link>
            <Link to="/operario/formato/incidencias" className="nav-link">Incidencias</Link>
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
        <span className={`role-badge ${ROLE_BADGE[currentUser.activeRole]}`}>
          {ROLE_LABELS[currentUser.activeRole]}
        </span>
        <span className="user-name">{currentUser.nombre}</span>
        <button className="logout-btn" onClick={handleLogout}>Salir</button>
      </div>
    </header>
  );
}
