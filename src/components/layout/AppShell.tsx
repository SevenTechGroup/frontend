import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/use-auth';
import { syncService, useNetworkStatus } from '../../offline';
import { can } from '../../security/authorization';
import { queryKeys } from '../../services';
import { BrandLogo } from '../brand/BrandLogo';

function navClass({ isActive }: { isActive: boolean }) {
  return `group inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
    isActive
      ? 'bg-teal-800 text-white shadow-lg shadow-teal-900/15'
      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
  }`;
}

function NavIcon({ name }: { name: 'dashboard' | 'reports' | 'new' | 'drafts' }) {
  const paths = {
    dashboard: 'M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z',
    reports: 'M7 3h8l4 4v14H7V3Zm8 0v5h4M10 12h6m-6 4h6',
    new: 'M12 5v14M5 12h14',
    drafts: 'M5 4h14v16H5V4Zm4 4h6m-6 4h6m-6 4h4',
  } as const;

  return (
    <svg className="size-4.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const roleLabels = {
  citizen: 'Citoyen',
  agent: 'Agent terrain',
  manager: 'Responsable',
} as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const initials =
    user?.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'SS';

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
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f8f7] text-slate-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_12%_10%,rgba(20,184,166,0.11),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(245,158,11,0.09),transparent_26%)]"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-6">
          <div className="mr-auto shrink-0">
            <BrandLogo to="/tableau-de-bord" />
          </div>

          <nav
            className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-0.5 lg:order-none lg:w-auto lg:overflow-visible lg:pb-0"
            aria-label="Navigation principale"
          >
            <NavLink to="/tableau-de-bord" className={navClass}>
              <NavIcon name="dashboard" />
              Tableau de bord
            </NavLink>
            <NavLink to="/signalements" className={navClass}>
              <NavIcon name="reports" />
              Signalements
            </NavLink>
            {can(user, 'report:create') && (
              <>
                <NavLink to="/signalements/nouveau" className={navClass}>
                  <NavIcon name="new" />
                  Nouveau
                </NavLink>
                <NavLink to="/brouillons" className={navClass}>
                  <NavIcon name="drafts" />
                  Brouillons
                </NavLink>
              </>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span
              aria-live="polite"
              className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-black sm:inline-flex ${
                isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
              }`}
            >
              <span
                className={`size-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>

            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 text-sm font-black text-white shadow-lg shadow-teal-900/15">
                {initials}
              </span>
              <span className="max-w-32 leading-tight">
                <strong className="block truncate text-sm font-black text-slate-900">
                  {user?.name}
                </strong>
                <span className="text-xs font-semibold text-slate-400">
                  {user ? roleLabels[user.role] : ''}
                </span>
              </span>
            </div>

            <button
              type="button"
              className="grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700"
              onClick={() => void handleLogout()}
              aria-label="Se déconnecter"
              title="Déconnexion"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4m5-3 4-4-4-4m4 4H9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {!isOnline && (
          <p
            role="status"
            className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-900"
          >
            Connexion interrompue · la saisie et les brouillons restent disponibles
          </p>
        )}
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
