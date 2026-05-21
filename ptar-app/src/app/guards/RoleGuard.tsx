import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from '../../models';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';

interface Props {
  allowedRoles: Role[];
  children: ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: Props) {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to={ROUTES.LOGIN} replace />;
  if (!allowedRoles.includes(currentUser.activeRole)) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <>{children}</>;
}
