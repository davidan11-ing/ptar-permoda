// Contexto global de autenticación: sesión, roles y equipo en turno
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AppUser, Role } from '../models';

// Clave de almacenamiento de sesión en localStorage
const SESSION_KEY = 'ptar_session';
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

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

// Roles disponibles según jerarquía del backend
function rolesForBackendRole(role: Role): Role[] {
  if (role === 'administrador') return ['operario', 'encargado', 'administrador'];
  if (role === 'encargado')     return ['operario', 'encargado'];
  return ['operario'];
}

// Contrato de valores expuestos por el contexto de auth
interface AuthContextValue {
  currentUser:          AppUser | null;
  loginWithCredentials: (email: string, password: string) => Promise<AppUser | null>;
  selectRole:           (role: Role) => void;
  updateEquipo:         (equipo: string[]) => void;
  logout:               () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Recupera la sesión persistida en localStorage al iniciar
function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

// Proveedor raíz de autenticación que envuelve toda la app
export function AuthProvider({ children }: { children: ReactNode }) {
  // Usuario autenticado activo en esta sesión
  const [currentUser, setCurrentUser] = useState<AppUser | null>(loadSession);

  // Limpia sesión local sin llamar al backend (usado en 401 y expiración)
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
  }, []);

  // Validar que la cookie sigue activa al cargar la app
  useEffect(() => {
    if (!currentUser) return;
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(res => { if (res.status === 401) clearSession(); })
      .catch(() => {});
  // Solo al montar — no re-ejecutar si clearSession cambia referencia
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escuchar 401 emitidos por ptarClient desde cualquier llamada API
  useEffect(() => {
    window.addEventListener('ptar:unauthorized', clearSession);
    return () => window.removeEventListener('ptar:unauthorized', clearSession);
  }, [clearSession]);

  // Autenticación con email y contraseña contra el backend
  const loginWithCredentials = useCallback(
    async (email: string, password: string): Promise<AppUser | null> => {
      try {
        const res = await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) return null;

        const data = await res.json();
        // El JWT llega como cookie httpOnly — no se almacena en JS
        const backendRole = data.role as Role;
        const session: AppUser = {
          id:         data.id,
          nombre:     data.nombre ?? email.split('@')[0],
          roles:      rolesForBackendRole(backendRole),
          activeRole: backendRole,
          equipo:     [data.nombre ?? email.split('@')[0]],
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setCurrentUser(session);
        return session;
      } catch {
        return null;
      }
    },
    [],
  );

  // Cambia el rol activo del usuario sin re-autenticar
  const selectRole = useCallback((role: Role) => {
    setCurrentUser(prev => {
      if (!prev || !prev.roles.includes(role)) return prev;
      const updated = { ...prev, activeRole: role };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Actualiza la lista de compañeros del turno actual
  const updateEquipo = useCallback((equipo: string[]) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, equipo };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Cierra sesión: invalida cookie en backend y limpia estado local
  const logout = useCallback(() => {
    fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ currentUser, loginWithCredentials, selectRole, updateEquipo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de acceso al contexto de autenticación
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
