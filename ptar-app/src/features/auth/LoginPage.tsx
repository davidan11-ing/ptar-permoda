import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, OPERARIOS_LISTA, USERS_BY_EMAIL } from '../../state/AuthContext';
import { ROLE_HOME } from '../../lib/routes';
import type { Role } from '../../models';

/* ── Labels / íconos / descripciones de roles ───────────────────────── */
const ROLE_LABELS: Record<Role, string> = {
  operario:      'Registro · Planta en Tiempo Real',
  encargado:     'Analista · Gestor de Datos',
  administrador: 'Visualizador Ejecutivo',
};
const ROLE_DESCS: Record<Role, string> = {
  operario:      'Registro de caudales, reactivos, calidad e incidencias en planta',
  encargado:     'Análisis de datos, dashboards de costos, calidad y balance hídrico',
  administrador: 'Visualización ejecutiva de indicadores, KPIs y reportes de gestión',
};
const ROLE_ICONS: Record<Role, React.ReactNode> = {
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

const LOGO_SVG = (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
    <circle cx="28" cy="28" r="27" stroke="#00c5e3" strokeWidth="2"/>
    <path d="M14 32c4-8 10-12 14-12s10 4 14 12" stroke="#00c5e3" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M28 20v8" stroke="#00c5e3" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="28" cy="34" r="3.5" fill="#00c5e3"/>
    <path d="M20 38c2.5 2 5 3 8 3s5.5-1 8-3" stroke="#00c5e3" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const INPUT_STYLE = (error?: boolean): React.CSSProperties => ({
  width: '100%', padding: '12px 14px', fontSize: 14,
  background: '#0d1117',
  border: `1px solid ${error ? '#f85149' : '#30363d'}`,
  borderRadius: 8, color: '#e6edf3', outline: 'none',
  boxSizing: 'border-box',
});

/* ── componente principal ────────────────────────────────────────────── */
export default function LoginPage() {
  const { loginWithCredentials, selectRole } = useAuth();
  const navigate = useNavigate();

  // flujo: 'select' → 'login' → 'roleselect'? → 'equipo'?
  const [step, setStep]             = useState<'select' | 'login' | 'roleselect' | 'equipo'>('select');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn]   = useState(false);
  const [equipoChecked, setEquipoChecked] = useState<string[]>([]);
  // nombre y role resueltos tras login exitoso
  const [loggedNombre, setLoggedNombre] = useState('');
  const [loggedRole,   setLoggedRole]   = useState<Role>('operario');

  // Resolución de nombre en tiempo real desde USERS_BY_EMAIL
  const emailKey    = email.toLowerCase().trim();
  const knownUser   = USERS_BY_EMAIL[emailKey];
  const resolvedName = knownUser?.nombre ?? '';
  // Rol principal (primer rol del perfil, o el seleccionado)
  const resolvedRole = knownUser?.roles[0] ?? selectedRole;
  // El email tiene roles que no coinciden con el rol seleccionado en paso 1
  const roleMismatch = knownUser && selectedRole && !knownUser.roles.includes(selectedRole);

  const resetLogin = () => {
    setEmail(''); setPassword(''); setLoginError(''); setLoggingIn(false);
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    resetLogin();
    setStep('login');
  };

  /* ── Paso 2: submit email + contraseña ── */
  const handleLoginSubmit = async () => {
    if (!email || !password) return;
    setLoggingIn(true);
    setLoginError('');

    const nombre = resolvedName || email.split('@')[0];
    const ok = await loginWithCredentials(email.trim(), password, [nombre]);
    setLoggingIn(false);

    if (!ok) {
      setLoginError('Correo o contraseña incorrectos. Inténtalo de nuevo.');
      return;
    }

    setLoggedNombre(nombre);

    // ¿Usuario multi-rol? → mostrar selector de rol
    const userRoles = knownUser?.roles ?? [resolvedRole ?? selectedRole ?? 'operario'] as Role[];
    if (userRoles.length > 1) {
      setStep('roleselect');
      return;
    }

    const finalRole = (userRoles[0] ?? 'operario') as Role;
    setLoggedRole(finalRole);

    if (finalRole === 'operario') {
      setEquipoChecked([]);
      setStep('equipo');
    } else {
      navigate(ROLE_HOME[finalRole]);
    }
  };

  const toggleEquipo = (n: string) =>
    setEquipoChecked(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);

  const doLogin = async (equipo: string[]) => {
    const equipoCompleto = [loggedNombre, ...equipo.filter(n => n !== loggedNombre)];
    const ok = await loginWithCredentials(email.trim(), password, equipoCompleto);
    if (ok) navigate(ROLE_HOME['operario']);
  };

  /* ────────────────────────────────────────────────────────────────────
     PASO 2 — Correo + Contraseña
  ──────────────────────────────────────────────────────────────────── */
  if (step === 'login') {
    return (
      <div className="login-page">
        <div className="login-bg" />
        <div className="login-container">

          <div className="login-header">
            <div className="login-logo">{LOGO_SVG}</div>
            <h1 className="login-title">Iniciar Sesión</h1>
            <p className="login-subtitle">
              {selectedRole ? ROLE_LABELS[selectedRole] : 'Ingresa tus credenciales'}
            </p>
          </div>

          <div className="login-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Campo de correo */}
            <div>
              <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Correo electrónico
              </label>
              <input
                type="email"
                placeholder="nombre@permoda.com.co"
                value={email}
                autoFocus
                onChange={e => { setEmail(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && password && handleLoginSubmit()}
                style={INPUT_STYLE(!!loginError && !password)}
              />

              {/* Resolución de nombre en tiempo real */}
              {email.length > 5 && (
                <div style={{ marginTop: 6, minHeight: 22 }}>
                  {resolvedName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: '#00c5e322', border: '1px solid #00c5e3',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#00c5e3',
                      }}>
                        {resolvedName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{resolvedName}</div>
                        {knownUser && (
                          <div style={{ fontSize: 10, color: '#8b949e' }}>
                            {knownUser.roles.length > 1
                              ? `${knownUser.roles.length} roles disponibles`
                              : ROLE_LABELS[knownUser.roles[0]]}
                          </div>
                        )}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto' }}>
                        <circle cx="8" cy="8" r="8" fill="#3fb95022"/>
                        <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="#3fb950" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#6e7681', fontStyle: 'italic' }}>
                      Correo no registrado — ingresa de todas formas si tienes acceso
                    </div>
                  )}
                </div>
              )}

              {roleMismatch && (
                <div style={{ fontSize: 11, color: '#d29922', marginTop: 4 }}>
                  ⚠ Este correo corresponde al rol {ROLE_LABELS[knownUser!.role]}
                </div>
              )}
            </div>

            {/* Campo de contraseña */}
            <div>
              <label style={{ fontSize: 11, color: '#8b949e', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLoginSubmit()}
                style={INPUT_STYLE(!!loginError)}
              />
            </div>

            {loginError && (
              <p style={{ color: '#f85149', fontSize: 12, margin: 0 }}>{loginError}</p>
            )}
          </div>

          <div className="login-footer" style={{ display: 'flex', gap: 10 }}>
            <button
              className="login-btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', flex: 0 }}
              onClick={() => { setStep('select'); resetLogin(); }}
            >
              ← Volver
            </button>
            <button
              className="login-btn"
              disabled={!email || !password || loggingIn}
              onClick={handleLoginSubmit}
            >
              {loggingIn ? 'Verificando...' : 'Ingresar →'}
            </button>
          </div>

        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────────
     PASO 3 — Selección de rol (usuarios multi-rol)
  ──────────────────────────────────────────────────────────────────── */
  if (step === 'roleselect') {
    const userRoles = (knownUser?.roles ?? ['administrador']) as Role[];
    const handlePickRole = (role: Role) => {
      selectRole(role);
      setLoggedRole(role);
      if (role === 'operario') {
        setEquipoChecked([]);
        setStep('equipo');
      } else {
        navigate(ROLE_HOME[role]);
      }
    };

    return (
      <div className="login-page">
        <div className="login-bg" />
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo">{LOGO_SVG}</div>
            <h1 className="login-title">¿Con qué rol entras?</h1>
            <p className="login-subtitle">
              <span style={{ fontWeight: 600, color: '#00c5e3' }}>{loggedNombre}</span>
              {' '}— elige el modo de trabajo para esta sesión
            </p>
          </div>

          <div className="login-body">
            <div className="role-cards">
              {userRoles.map(role => (
                <button
                  key={role}
                  onClick={() => handlePickRole(role)}
                  style={{ textAlign: 'left', cursor: 'pointer', width: '100%', background: 'none', border: 'none', padding: 0 }}
                >
                  <div className={`role-card-header role-header-${role}`} style={{ pointerEvents: 'none' }}>
                    <span className="role-card-icon">{ROLE_ICONS[role]}</span>
                    <div>
                      <span className="role-card-title">{ROLE_LABELS[role]}</span>
                      <span className="role-card-desc">{ROLE_DESCS[role]}</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', opacity: .4 }}>
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="login-footer">
            <button
              className="login-btn"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onClick={() => { setStep('login'); resetLogin(); }}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────────
     PASO 4 — Equipo en turno (solo operario)
  ──────────────────────────────────────────────────────────────────── */
  if (step === 'equipo') {
    const otrosOperarios = OPERARIOS_LISTA.filter(n => n !== loggedNombre);
    return (
      <div className="login-page">
        <div className="login-bg" />
        <div className="login-container">
          <div className="login-header">
            <div className="login-logo">{LOGO_SVG}</div>
            <h1 className="login-title">Equipo en Turno</h1>
            <p className="login-subtitle">Marca quiénes más están presentes en este turno</p>
          </div>

          <div className="login-body">
            {/* Responsable del registro (nombre real) */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Responsable del registro
              </p>
              <div className="user-item selected" style={{ cursor: 'default' }}>
                <div className="user-avatar">{loggedNombre.charAt(0)}</div>
                <span style={{ fontWeight: 600 }}>{loggedNombre}</span>
                <svg className="check-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="9" fill="#00c5e3"/>
                  <path d="M5 9l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Checklist del equipo */}
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Compañeros en turno (opcional)
            </p>
            <div className="user-list">
              {otrosOperarios.map(nombre => {
                const checked = equipoChecked.includes(nombre);
                return (
                  <button key={nombre} type="button"
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
              onClick={() => setStep('login')}
            >
              ← Volver
            </button>
            <button className="login-btn" onClick={() => void doLogin(equipoChecked)}>
              {equipoChecked.length > 0
                ? `Ingresar con equipo de ${1 + equipoChecked.length}`
                : 'Ingresar solo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────────
     PASO 1 — Selección de rol
  ──────────────────────────────────────────────────────────────────── */
  const ROLES: Role[] = ['operario', 'encargado', 'administrador'];

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">{LOGO_SVG}</div>
          <h1 className="login-title">PTAR</h1>
          <p className="login-subtitle">Sistema de Gestión de Planta de<br/>Tratamiento de Aguas Residuales</p>
        </div>

        <div className="login-body">
          <p className="login-instruction">Selecciona tu perfil para continuar</p>

          <div className="role-cards">
            {ROLES.map(role => (
              <button
                key={role}
                className={`role-group role-group-btn`}
                onClick={() => handleSelectRole(role)}
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%', background: 'none', border: 'none', padding: 0 }}
              >
                <div className={`role-card-header role-header-${role}`} style={{ pointerEvents: 'none' }}>
                  <span className="role-card-icon">{ROLE_ICONS[role]}</span>
                  <div>
                    <span className="role-card-title">{ROLE_LABELS[role]}</span>
                    <span className="role-card-desc">{ROLE_DESCS[role]}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginLeft: 'auto', opacity: .4 }}>
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
