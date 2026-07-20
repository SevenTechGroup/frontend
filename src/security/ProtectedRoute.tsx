import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../app/providers/use-auth';
import type { UserRole } from '../models';
import { hasRole } from './authorization';

interface ProtectedRouteProps {
  roles?: readonly UserRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center" aria-busy="true">
        <p>Vérification de la session…</p>
      </main>
    );
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  if (roles && !hasRole(user, roles)) {
    return <Navigate to="/non-autorise" replace />;
  }

  return <Outlet />;
}
