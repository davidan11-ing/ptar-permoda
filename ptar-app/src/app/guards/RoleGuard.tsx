// Guard de autorización que redirige al login si el usuario no tiene el rol requerido
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from '../../models';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';

// Prop types: roles permitidos y contenido a proteger
interface Props {
  allowedRoles: Role[];
  children: ReactNode;
}

// Barrera de acceso basada en el rol activo del usuario autenticado
export default function RoleGuard({ allowedRoles, children }: Props) {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to={ROUTES.LOGIN} replace />;
  if (!allowedRoles.includes(currentUser.activeRole)) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
}
