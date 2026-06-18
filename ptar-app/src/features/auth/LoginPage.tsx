import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, OPERARIOS_LISTA } from '../../state/AuthContext';
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
  const { loginWithCredentials, selectRole, updateEquipo } = useAuth();
  const navigate = useNavigate();

  // flujo: 'login' → 'roleselect'? → 'equipo'?
  const [step, setStep]             = useState<'login' | 'roleselect' | 'equipo'>('login');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn]   = useState(false);
  const [equipoChecked, setEquipoChecked] = useState<string[]>([]);
  const [loggedNombre, setLoggedNombre] = useState('');
  const [loggedRoles, setLoggedRoles] = useState<Role[]>([]);

  /* ── Paso 2: submit email + contraseña ── */
  const handleLoginSubmit = async () => {
    if (!email || !password) return;
    setLoggingIn(true);
    setLoginError('');

    const user = await loginWithCredentials(email.trim(), password);
    setLoggingIn(false);

    if (!user) {
      setLoginError('Correo o contraseña incorrectos. Inténtalo de nuevo.');
      return;
    }

    setLoggedNombre(user.nombre);
    setLoggedRoles(user.roles);

    if (user.roles.length > 1) {
      setStep('roleselect');
      return;
    }

    const finalRole = user.roles[0] ?? 'operario';

    if (finalRole === 'operario') {
      setEquipoChecked([]);
      setStep('equipo');
    } else {
      navigate(ROLE_HOME[finalRole]);
    }
  };

  const toggleEquipo = (n: string) =>
    setEquipoChecked(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]);

  // ── doLogin: el usuario ya está autenticado — solo actualiza equipo y navega ─
  // NO llamar loginWithCredentials de nuevo: eso sobreescribiría activeRole con
  // el valor del backend (ej. 'administrador'), rompiendo el RoleGuard de /operario
  const doLogin = (equipo: string[]) => {
    const equipoCompleto = [loggedNombre, ...equipo.filter(n => n !== loggedNombre)];
    updateEquipo(equipoCompleto);         // guarda equipo en session sin re-auth
    selectRole('operario');               // confirma activeRole = 'operario'
    navigate(ROLE_HOME['operario']);
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
            <p className="login-subtitle">Ingresa tus credenciales para continuar</p>
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

              {email.length > 5 && (
                <div style={{ marginTop: 6, minHeight: 22, fontSize: 11, color: '#6e7681', fontStyle: 'italic' }}>
                  Ingresa tu contraseña para continuar
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
              onClick={() => navigate('/')}
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
    const userRoles = loggedRoles.length > 0 ? loggedRoles : (['administrador'] as Role[]);
    const handlePickRole = (role: Role) => {
      selectRole(role);
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
            <button className="login-btn" onClick={() => doLogin(equipoChecked)}>
              {equipoChecked.length > 0
                ? `Ingresar con equipo de ${1 + equipoChecked.length}`
                : 'Ingresar solo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
