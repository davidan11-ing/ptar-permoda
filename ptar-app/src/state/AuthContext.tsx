import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppUser, Role } from '../models';
import { TOKEN_KEY } from '../services/ptarClient';

// Lista de operarios disponibles para el checklist de equipo en turno
export const OPERARIOS_LISTA = [
  'Raul Buenhombre Guzman',
  'Marcos Eduardo Bolívar Biarreta',
  'Joan Alejandro García Echeverry',
  'Daniel Ricardo Duran Benavides',
  'Randy Stephan Ramirez Lopera',
  'Marlon Stich Florez Espinel',
  'Emanuel Brayan Ceballos Chango',
  'Cristian Camilo Rincón Ocampo',
  'Yamid Yate Daza',
  'Luisa Fernanda Contreras',
  'Andrés Camilo Caviativa Bolívar',
  'Jonier José Castañeda Parra',
  'Luna Sofía Osorio Parra',
];

const SESSION_KEY = 'ptar_session';
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// ── Mapa email → perfil (nombre + roles que puede usar en la app) ─────────────
// Si un usuario tiene más de 1 rol, el login mostrará un selector de rol.
export const USERS_BY_EMAIL: Record<string, { nombre: string; roles: Role[] }> = {
  // Multi-rol — elige con qué rol entrar cada vez
  'davidan@permoda.com.co':   { nombre: 'David Arévalo',           roles: ['operario', 'encargado', 'administrador'] },
  // Analistas (encargado)
  'lunaop@permoda.com.co':    { nombre: 'Luna Sofía Osorio Parra', roles: ['operario', 'encargado', 'administrador'] },
  'encargado@permoda.com.co': { nombre: 'Encargado',               roles: ['encargado'] },
  // Operarios de planta (registro)
  'operario@permoda.com.co':  { nombre: 'Operario',                roles: ['operario']  },
};

interface AuthContextValue {
  currentUser:         AppUser | null;
  loginWithCredentials: (email: string, password: string, equipo?: string[]) => Promise<boolean>;
  selectRole:          (role: Role) => void;
  logout:              () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AppUser;
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    return user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(loadSession);

  // ── Login real con email + contraseña ───────────────────────────────────────
  const loginWithCredentials = useCallback(
    async (email: string, password: string, equipo?: string[]): Promise<boolean> => {
      try {
        const res = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return false;

        const data = await res.json();
        localStorage.setItem(TOKEN_KEY, data.access_token);

        // Verificar si el email tiene override de roles en USERS_BY_EMAIL
        const emailKey    = email.toLowerCase().trim();
        const knownProfile = USERS_BY_EMAIL[emailKey];
        const roles: Role[] = knownProfile?.roles ?? [data.role as Role];
        const nombre: string = knownProfile?.nombre ?? data.nombre ?? email.split('@')[0];

        // activeRole se fijará en el selector de rol si hay más de 1;
        // provisionalmente usamos el rol que devuelve el backend.
        const backendRole = data.role as Role;
        const activeRole  = roles.includes(backendRole) ? backendRole : roles[0];

        const session: AppUser = {
          id:         data.id,
          nombre,
          roles,
          activeRole,
          equipo: equipo ?? [nombre],
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setCurrentUser(session);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const selectRole = useCallback((role: Role) => {
    setCurrentUser(prev => {
      if (!prev || !prev.roles.includes(role)) return prev;
      const updated = { ...prev, activeRole: role };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loginWithCredentials, selectRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
