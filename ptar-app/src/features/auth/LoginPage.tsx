import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, MOCK_USERS, OPERARIOS_LISTA } from '../../state/AuthContext';
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
  const [equipoChecked, setEquipoChecked] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'password' | 'equipo'>('select');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();

  const isOperario = selected?.roles[0] === 'operario';

  const handleSelectUser = (user: AppUser) => {
    setSelected(user);
    setEquipoChecked([]);
    setLoginError('');
    setPassword('');
  };

  const handleNext = () => {
    if (!selected) return;
    setStep('password');
  };

  const handlePasswordSubmit = async () => {
    if (!selected || !password) return;
    setLoggingIn(true);
    setLoginError('');
    // selected.id es el email (ver MOCK_USERS en AuthContext)
    const ok = await loginWithCredentials(selected.id, password, [selected.nombre]);
    setLoggingIn(false);
    if (!ok) {
      setLoginError('Contraseña incorrecta. Inténtalo de nuevo.');
      return;
    }
    if (isOperario) {
      setStep('equipo');
    } else {
      navigate(ROLE_HOME[selected.roles[0]]);
    }
  };

  const toggleEquipo = (nombre: string) => {
    setEquipoChecked(prev =>
      prev.includes(nombre) ? prev.filter(n => n !== nombre) : [...prev, nombre]
    );
  };

  const doLogin = async (equipo: string[]) => {
    if (!selected) return;
    const equipoCompleto = [selected.nombre, ...equipo.filter(n => n !== selected.nombre)];
    const ok = await loginWithCredentials(selected.id, password, equipoCompleto);
    if (ok) navigate(ROLE_HOME[selected.roles[0]]);
  };

  const uniqueRoleGroups = [
    { role: 'operario' as const, users: MOCK_USERS.filter(u => u.roles.includes('operario') && u.roles.length === 1) },
    { role: 'encargado' as const, users: MOCK_USERS.filter(u => u.roles.includes('encargado') && u.roles.length === 1) },
    { role: 'administrador' as const, users: MOCK_USERS.filter(u => u.roles.includes('administrador') && u.roles.length === 1) },
  ];

  // ── Paso 2: Contraseña ────────────────────────────────────────────────────────
  if (step === 'password' && selected) {
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
              </svg>
            </div>
            <h1 className="login-title">Verificación</h1>
            <p className="login-subtitle">Ingresa tu contraseña para continuar</p>
          </div>

          <div className="login-body">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div className="user-item selected" style={{ cursor: 'default', justifyContent: 'center', gap: 12 }}>
                <div className="user-avatar">{selected.nombre.charAt(0)}</div>
                <span style={{ fontWeight: 600 }}>{selected.nombre}</span>
                <span style={{ fontSize: 11, color: '#8b949e' }}>({ROLE_LABELS[selected.roles[0]]})</span>
              </div>
            </div>

            <div style={{ marginBottom: loginError ? 8 : 0 }}>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px', fontSize: 14,
                  background: '#0d1117', border: `1px solid ${loginError ? '#f85149' : '#30363d'}`,
                  borderRadius: 8, color: '#e6edf3', outline: 'none',
                }}
              />
            </div>
            {loginError && (
              <p style={{ color: '#f85149', fontSize: 12, marginBottom: 8 }}>{loginError}</p>
            )}
          </div>

          <div className="login-footer" style={{ display: 'flex', gap: 10 }}>
            <button
              className="login-btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', flex: 0 }}
              onClick={() => { setStep('select'); setPassword(''); setLoginError(''); }}
            >
              ← Volver
            </button>
            <button
              className="login-btn"
              disabled={!password || loggingIn}
              onClick={handlePasswordSubmit}
            >
              {loggingIn ? 'Verificando...' : 'Ingresar →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 3: Selección de equipo ─────────────────────────────────────────────
  if (step === 'equipo' && selected) {
    const otrosOperarios = OPERARIOS_LISTA.filter(n => n !== selected.nombre);
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
            <h1 className="login-title">Equipo en Turno</h1>
            <p className="login-subtitle">Marca quiénes más están presentes en este turno</p>
          </div>

          <div className="login-body">
            {/* Operario principal (fijo, no desmarcable) */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Responsable del registro
              </p>
              <div className="user-item selected" style={{ cursor: 'default' }}>
                <div className="user-avatar">{selected.nombre.charAt(0)}</div>
                <span>{selected.nombre}</span>
                <svg className="check-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="9" fill="#00c5e3"/>
                  <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Checklist del equipo */}
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Compañeros en turno (opcional)
            </p>
            <div className="user-list">
              {otrosOperarios.map(nombre => {
                const checked = equipoChecked.includes(nombre);
                return (
                  <button
                    key={nombre}
                    type="button"
                    className={`user-item ${checked ? 'selected' : ''}`}
                    onClick={() => toggleEquipo(nombre)}
                  >
                    <div className="user-avatar" style={{ background: checked ? '#3fb950' : undefined }}>
                      {nombre.charAt(0)}
                    </div>
                    <span>{nombre}</span>
                    {checked && (
                      <svg className="check-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="9" fill="#3fb950"/>
                        <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="login-footer" style={{ display: 'flex', gap: 10 }}>
            <button
              className="login-btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', flex: 0 }}
              onClick={() => setStep('select')}
            >
              ← Volver
            </button>
            <button
              className="login-btn"
              onClick={() => void doLogin(equipoChecked)}
            >
              {equipoChecked.length > 0
                ? `Ingresar con equipo de ${1 + equipoChecked.length}`
                : 'Ingresar solo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 1: Selección de usuario ────────────────────────────────────────────
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
                      onClick={() => handleSelectUser(user)}
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
                onClick={() => handleSelectUser(user)}
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
            onClick={handleNext}
          >
            {isOperario && selected ? 'Siguiente →' : 'Ingresar al Sistema'}
          </button>
        </div>
      </div>
    </div>
  );
}
