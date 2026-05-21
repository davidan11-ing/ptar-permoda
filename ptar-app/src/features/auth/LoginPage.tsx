import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, MOCK_USERS } from '../../state/AuthContext';
import { ROLE_HOME } from '../../lib/routes';
import type { AppUser } from '../../models';

const ROLE_LABELS = { operario: 'Operario', encargado: 'Encargado', administrador: 'Administrador' };
const ROLE_ICONS = {
  operario: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 18l2 4h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  encargado: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 14l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  administrador: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M24 22v2l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const ROLE_DESCS = {
  operario: 'Registro de parámetros operativos y formatos de turno',
  encargado: 'Monitoreo, edición de dashboards y gestión de planta',
  administrador: 'Visualización ejecutiva de indicadores y KPIs',
};

export default function LoginPage() {
  const [selected, setSelected] = useState<AppUser | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!selected) return;
    const ok = login(selected.id);
    if (ok) navigate(ROLE_HOME[selected.roles[0]]);
  };

  const uniqueRoleGroups = [
    { role: 'operario' as const, users: MOCK_USERS.filter(u => u.roles.includes('operario') && u.roles.length === 1) },
    { role: 'encargado' as const, users: MOCK_USERS.filter(u => u.roles.includes('encargado') && u.roles.length === 1) },
    { role: 'administrador' as const, users: MOCK_USERS.filter(u => u.roles.includes('administrador') && u.roles.length === 1) },
  ];

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="27" stroke="#00c5e3" strokeWidth="2"/>
              <path d="M14 32c4-8 10-12 14-12s10 4 14 12" stroke="#00c5e3" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M28 20v8" stroke="#00c5e3" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="28" cy="34" r="3.5" fill="#00c5e3"/>
              <path d="M20 38c2.5 2 5 3 8 3s5.5-1 8-3" stroke="#00c5e3" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="login-title">PTAR</h1>
          <p className="login-subtitle">Sistema de Gestión de Planta de<br/>Tratamiento de Aguas Residuales</p>
        </div>

        <div className="login-body">
          <p className="login-instruction">Selecciona tu perfil para continuar</p>

          <div className="role-cards">
            {uniqueRoleGroups.map(({ role, users }) => (
              <div key={role} className="role-group">
                <div className={`role-card-header role-header-${role}`}>
                  <span className="role-card-icon">{ROLE_ICONS[role]}</span>
                  <div>
                    <span className="role-card-title">{ROLE_LABELS[role]}</span>
                    <span className="role-card-desc">{ROLE_DESCS[role]}</span>
                  </div>
                </div>
                <div className="user-list">
                  {users.map(user => (
                    <button
                      key={user.id}
                      className={`user-item ${selected?.id === user.id ? 'selected' : ''}`}
                      onClick={() => setSelected(user)}
                    >
                      <div className="user-avatar">{user.nombre.charAt(0)}</div>
                      <span>{user.nombre}</span>
                      {selected?.id === user.id && (
                        <svg className="check-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <circle cx="9" cy="9" r="9" fill="#00c5e3"/>
                          <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Multi-role user */}
          <div className="multirol-section">
            <span className="multirol-label">Acceso multi-rol:</span>
            {MOCK_USERS.filter(u => u.roles.length > 1).map(user => (
              <button
                key={user.id}
                className={`user-item multirol-item ${selected?.id === user.id ? 'selected' : ''}`}
                onClick={() => setSelected(user)}
              >
                <div className="user-avatar user-avatar-multi">{user.nombre.charAt(0)}</div>
                <div>
                  <span className="multirol-name">{user.nombre}</span>
                  <span className="multirol-roles">{user.roles.map(r => ROLE_LABELS[r]).join(' · ')}</span>
                </div>
                {selected?.id === user.id && (
                  <svg className="check-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="9" fill="#00c5e3"/>
                    <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="login-footer">
          <button
            className="login-btn"
            disabled={!selected}
            onClick={handleLogin}
          >
            Ingresar al Sistema
          </button>
        </div>
      </div>
    </div>
  );
}
