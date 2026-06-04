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

// ── Mapa email → perfil de usuario ───────────────────────────────────────────
export const USERS_BY_EMAIL: Record<string, { nombre: string; role: Role }> = {
  // Administradores / multi-rol
  'davidan@permoda.com.co':      { nombre: 'David Andrade',           role: 'administrador' },
  // Analistas (encargado)
  'lunaop@permoda.com.co':       { nombre: 'Luna Sofía Osorio Parra', role: 'encargado'     },
  'encargado@permoda.com.co':    { nombre: 'Encargado',               role: 'encargado'     },
  // Operarios de planta (registro)
  'operario@permoda.com.co':     { nombre: 'Operario',                role: 'operario'      },
};

interface AuthContextValue {
  currentUser: AppUser | null;
  loginWithCredentials: (email: string, password: string, equipo?: string[]) => Promise<boolean>;
  selectRole: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as AppUser;
    // Verificar que el token sigue en localStorage (no expirado localmente)
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
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

        // Guardar JWT
        localStorage.setItem(TOKEN_KEY, data.access_token);

        // Construir sesión del usuario
        const session: AppUser = {
          id: data.id,
          nombre: data.nombre,
          roles: [data.role as Role],
          activeRole: data.role as Role,
          equipo: equipo ?? [data.nombre],
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

// Mantener compatibilidad: exportar lista de usuarios para la UI de login
export const MOCK_USERS = Object.entries(USERS_BY_EMAIL).map(([email, u]) => ({
  id: email,
  nombre: u.nombre,
  roles: [u.role] as Role[],
  activeRole: u.role,
  email,
}));
