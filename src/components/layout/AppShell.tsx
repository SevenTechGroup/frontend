import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/use-auth';
import { syncService, useNetworkStatus } from '../../offline';
import { can } from '../../security/authorization';
import { queryKeys } from '../../services';

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
  }`;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (!isOnline || !syncService.isAutomaticSyncEnabled()) return;

    void syncService
      .synchronize()
      .then(async (summary) => {
        if (summary.processed === 0) return;
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
          queryClient.invalidateQueries({ queryKey: queryKeys.drafts }),
          queryClient.invalidateQueries({ queryKey: queryKeys.syncQueue }),
        ]);
      })
      .catch(() => undefined);
  }, [isOnline, queryClient]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      void navigate('/connexion', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/tableau-de-bord" className="text-lg font-bold text-teal-800">
            Sahel Signal
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Navigation principale">
            <NavLink to="/tableau-de-bord" className={navClass}>
              Tableau de bord
            </NavLink>
            <NavLink to="/signalements" className={navClass}>
              Signalements
            </NavLink>
            {can(user, 'report:create') && (
              <>
                <NavLink to="/signalements/nouveau" className={navClass}>
                  Nouveau
                </NavLink>
                <NavLink to="/brouillons" className={navClass}>
                  Brouillons
                </NavLink>
              </>
            )}
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => void handleLogout()}
            >
              Déconnexion
            </button>
          </nav>
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-3 text-xs text-slate-500">
          <p>
            Connecté en tant que {user?.name} · {user?.role}
          </p>
          <p
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold ${
              isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
            }`}
          >
            <span
              className={`size-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            {isOnline ? 'En ligne' : 'Hors ligne · saisie disponible'}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
