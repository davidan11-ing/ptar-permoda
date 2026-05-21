import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppUser, Role } from '../models';

const MOCK_USERS: AppUser[] = [
  { id: 'op1', nombre: 'Carlos Mendoza', roles: ['operario'], activeRole: 'operario' },
  { id: 'op2', nombre: 'Ana Suárez', roles: ['operario'], activeRole: 'operario' },
  { id: 'enc1', nombre: 'Jorge Rivera', roles: ['encargado'], activeRole: 'encargado' },
  { id: 'adm1', nombre: 'Laura Gómez', roles: ['administrador'], activeRole: 'administrador' },
  { id: 'multi1', nombre: 'Director PTAR', roles: ['encargado', 'administrador'], activeRole: 'encargado' },
];

// Lista de operarios disponibles para el checklist de equipo en turno
export const OPERARIOS_LISTA = [
  'Carlos Mendoza',
  'Ana Suárez',
  'Operario 3',
  'Operario 4',
  'Operario 5',
  'Operario 6',
];

const SESSION_KEY = 'ptar_session';

interface AuthContextValue {
  currentUser: AppUser | null;
  login: (userId: string, equipo?: string[]) => boolean;
  selectRole: (role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(loadSession);

  const login = useCallback((userId: string, equipo?: string[]): boolean => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) return false;
    const session: AppUser = {
      ...user,
      activeRole: user.roles[0],
      equipo: equipo ?? [user.nombre],
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setCurrentUser(session);
    return true;
  }, []);

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
    setCurrentUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, selectRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { MOCK_USERS };
