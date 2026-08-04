// Barra de navegación principal con links por rol, selector de rol y acciones de usuario
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../state/ThemeContext';
import { ROLE_HOME, ROUTES } from '../../lib/routes';
import { useLocation } from 'react-router-dom';
import type { Role } from '../../models';
import ChangePasswordModal from './ChangePasswordModal';

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

// Clase CSS del badge según rol
const ROLE_BADGE: Record<Role, string> = {
  operario: 'badge-operario',
  encargado: 'badge-encargado',
  administrador: 'badge-admin',
};

// Navbar principal de la aplicación
export default function Navbar() {
  const { currentUser, selectRole, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [showPwModal, setShowPwModal] = useState(false);

  if (!currentUser) return null;

  // Cambia el rol activo y redirige al home del rol seleccionado
  const handleRoleSwitch = (role: Role) => {
    selectRole(role);
    navigate(ROLE_HOME[role]);
  };

  // Cierra sesión y redirige al login
  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="navbar">
      {/* Logo y título de la app */}
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

      {/* Links de navegación filtrados por rol activo */}
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
        {currentUser.activeRole === 'encargado' && (
          <>
            <Link
              to={ROLE_HOME['encargado']}
              className={`nav-link${location.pathname === ROLE_HOME['encargado'] ? ' active' : ''}`}
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
            <Link
              to={ROUTES.MANTENIMIENTOS}
              className={`nav-link${location.pathname.startsWith(ROUTES.MANTENIMIENTOS) ? ' active' : ''}`}
            >
              🔧 Mantenimientos
            </Link>
            <Link
              to={ROUTES.ENCARGADO_ANALISIS}
              className={`nav-link${location.pathname.startsWith(ROUTES.ENCARGADO_ANALISIS) ? ' active' : ''}`}
            >
              📊 Análisis
            </Link>
          </>
        )}
        {currentUser.activeRole === 'administrador' && (
          <>
            <Link
              to={ROLE_HOME['administrador']}
              className={`nav-link${location.pathname === ROLE_HOME['administrador'] ? ' active' : ''}`}
            >
              Dashboard
            </Link>
            <Link
              to={ROUTES.MANTENIMIENTOS}
              className={`nav-link${location.pathname.startsWith(ROUTES.MANTENIMIENTOS) ? ' active' : ''}`}
            >
              🔧 Mantenimientos
            </Link>
          </>
        )}
      </nav>

      {/* Sección derecha: selector de rol, badge, nombre de usuario y acciones */}
      <div className="navbar-user">
        {currentUser.roles.length > 1 && (
          // Botones para cambiar entre los roles disponibles del usuario
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
        <button
          className="logout-btn"
          style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', marginRight: 4, fontSize: 14 }}
          onClick={toggle}
          title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {isDark ? '☀' : '☾'}
        </button>
        <button
          className="logout-btn"
          style={{ background: 'none', border: '1px solid #30363d', color: '#8b949e', marginRight: 4 }}
          onClick={() => setShowPwModal(true)}
          title="Cambiar contraseña"
        >
          🔑
        </button>
        <button className="logout-btn" onClick={handleLogout}>Salir</button>
      </div>

      {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
    </header>
  );
}
