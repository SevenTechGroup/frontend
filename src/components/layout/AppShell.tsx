import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/use-auth';
import type { Notification } from '../../models';
import { offlineDataCache, syncService, useNetworkStatus } from '../../offline';
import { can } from '../../security/authorization';
import {
  assignmentService,
  dashboardService,
  mergeRealtimeNotification,
  notificationRealtimeService,
  notificationService,
  queryKeys,
  referenceService,
  reportService,
} from '../../services';
import { BrandLogo } from '../brand/BrandLogo';

function navClass({ isActive }: { isActive: boolean }) {
  return `group inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold transition 2xl:px-3.5 2xl:text-sm ${
    isActive
      ? 'bg-teal-800 text-white shadow-lg shadow-teal-900/15'
      : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
  }`;
}

type NavIconName = 'dashboard' | 'reports' | 'assignments' | 'notifications' | 'new' | 'drafts';

interface NavigationItem {
  to: string;
  icon: NavIconName;
  label: string;
  badge?: number;
}

function NavIcon({ name }: { name: NavIconName }) {
  const paths = {
    dashboard: 'M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z',
    reports: 'M7 3h8l4 4v14H7V3Zm8 0v5h4M10 12h6m-6 4h6',
    assignments: 'M8 6h11v14H5V6h3Zm0 0V4h6v2M9 11h6m-6 4h4',
    notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4',
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
  agent: 'Intervenant terrain',
  manager: 'Responsable',
} as const;

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<
    'disabled' | 'connected' | 'disconnected' | 'connecting' | 'reconnecting' | 'failed'
  >('disabled');
  const [liveAnnouncement, setLiveAnnouncement] = useState<string | null>(null);
  const notifications = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationService.list(),
    enabled: Boolean(user),
    staleTime: 60_000,
    refetchInterval: isOnline && realtimeStatus !== 'connected' ? 30_000 : false,
  });
  const unreadCount =
    notifications.data?.filter((notification) => !notification.is_read).length ?? 0;
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

  useEffect(() => {
    if (!isOnline || !user) return;

    const reportsTask = queryClient.fetchQuery({
      queryKey: queryKeys.reports,
      queryFn: () => reportService.list(),
      staleTime: 60_000,
    });
    const preloadTasks: Promise<unknown>[] = [
      reportsTask,
      queryClient.fetchQuery({
        queryKey: queryKeys.dashboard,
        queryFn: () => dashboardService.get(),
        staleTime: 60_000,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.categories,
        queryFn: () => referenceService.categories(),
        staleTime: 60_000,
      }),
      queryClient.fetchQuery({
        queryKey: queryKeys.territories,
        queryFn: () => referenceService.territories(),
        staleTime: 60_000,
      }),
    ];

    if (can(user, 'assignment:view')) {
      preloadTasks.push(
        queryClient.fetchQuery({
          queryKey: queryKeys.assignments,
          queryFn: () => assignmentService.list(),
          staleTime: 60_000,
        }),
      );
    }

    if (can(user, 'assignment:create')) {
      preloadTasks.push(
        queryClient.fetchQuery({
          queryKey: queryKeys.agents,
          queryFn: () => referenceService.agents(),
          staleTime: 60_000,
        }),
      );
    }

    void Promise.allSettled(preloadTasks);
    void reportsTask
      .then((reports) => {
        const attachments = reports
          .flatMap((report) => report.attachments ?? [])
          .filter((attachment) => attachment.mime_type.startsWith('image/'));

        return Promise.allSettled(
          attachments.map((attachment) =>
            queryClient.fetchQuery({
              queryKey: queryKeys.attachmentContent(attachment.id),
              queryFn: () => reportService.getAttachmentContent(attachment.id),
              staleTime: 15 * 60_000,
            }),
          ),
        );
      })
      .catch(() => undefined);
  }, [isOnline, queryClient, user]);

  useEffect(() => {
    if (!isOnline || !user) return;

    let isActive = true;
    let disconnect: (() => void) | undefined;

    void notificationRealtimeService
      .connect(user.id, {
        onStatus(status) {
          if (isActive) setRealtimeStatus(status);
        },
        onEvent(event) {
          if (!isActive) return;

          let updatedCache: Notification[] | undefined;
          queryClient.setQueryData<Notification[]>(queryKeys.notifications, (current) => {
            updatedCache = mergeRealtimeNotification(current, event);
            return updatedCache;
          });

          if (updatedCache) void offlineDataCache.store('notifications', updatedCache);
          void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });

          if (event.action === 'created' && !event.notification.is_read) {
            setLiveAnnouncement(event.notification.message);
          }
        },
      })
      .then((subscription) => {
        if (!subscription) return;
        if (!isActive) {
          subscription.disconnect();
          return;
        }
        disconnect = () => subscription.disconnect();
      })
      .catch(() => {
        if (isActive) setRealtimeStatus('failed');
      });

    return () => {
      isActive = false;
      disconnect?.();
    };
  }, [isOnline, queryClient, user]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      void navigate('/connexion', { replace: true });
    }
  };

  const navigationItems: NavigationItem[] = [
    { to: '/tableau-de-bord', icon: 'dashboard', label: 'Tableau de bord' },
    { to: '/signalements', icon: 'reports', label: 'Signalements' },
  ];

  if (can(user, 'assignment:view')) {
    navigationItems.push({ to: '/affectations', icon: 'assignments', label: 'Affectations' });
  }

  navigationItems.push({
    to: '/notifications',
    icon: 'notifications',
    label: 'Notifications',
    badge: unreadCount,
  });

  if (can(user, 'report:create')) {
    navigationItems.push(
      { to: '/signalements/nouveau', icon: 'new', label: 'Nouveau' },
      { to: '/brouillons', icon: 'drafts', label: 'Brouillons' },
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f8f7] text-slate-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_12%_10%,rgba(20,184,166,0.11),transparent_34%),radial-gradient(circle_at_88%_4%,rgba(245,158,11,0.09),transparent_26%)]"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[100rem] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 xl:gap-4">
          <div className="mr-auto shrink-0 xl:mr-0">
            <BrandLogo to="/tableau-de-bord" />
          </div>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex 2xl:gap-1"
            aria-label="Navigation principale"
          >
            {navigationItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                <NavIcon name={item.icon} />
                {item.label}
                {Boolean(item.badge) && (
                  <span
                    className="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-teal-950"
                    aria-label={`${item.badge} notification${item.badge === 1 ? '' : 's'} non lue${item.badge === 1 ? '' : 's'}`}
                  >
                    {item.badge && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span
              aria-live="polite"
              title={
                !isOnline
                  ? 'Connexion réseau indisponible'
                  : realtimeStatus === 'connected'
                    ? 'Notifications WebSocket actives'
                    : 'Les notifications sont actualisées périodiquement'
              }
              className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-black sm:inline-flex ${
                isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
              }`}
            >
              <span
                className={`size-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              <span className="hidden 2xl:inline">
                {!isOnline
                  ? 'Hors ligne'
                  : realtimeStatus === 'connected'
                    ? 'Temps réel'
                    : 'En ligne'}
              </span>
            </span>

            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
              <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-teal-700 to-emerald-600 text-sm font-black text-white shadow-lg shadow-teal-900/15">
                {initials}
              </span>
              <span className="hidden max-w-32 leading-tight 2xl:block">
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
              className="hidden size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 xl:grid"
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

            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-900 xl:hidden"
              aria-expanded={isMenuOpen}
              aria-controls="menu-principal-mobile"
              aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d={isMenuOpen ? 'M6 6l12 12M18 6 6 18' : 'M4 7h16M4 12h16M4 17h16'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div
            id="menu-principal-mobile"
            className="border-t border-slate-200 bg-white px-4 py-4 shadow-xl shadow-slate-900/10 sm:px-6 xl:hidden"
          >
            <nav
              className="mx-auto grid max-w-4xl gap-1 sm:grid-cols-2"
              aria-label="Navigation principale mobile"
            >
              {navigationItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navClass}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                  {Boolean(item.badge) && (
                    <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black leading-none text-teal-950">
                      {item.badge && item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="mx-auto mt-4 flex max-w-4xl items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="min-w-0">
                <strong className="block truncate text-sm font-black text-slate-900">
                  {user?.name}
                </strong>
                <span className="text-xs font-semibold text-slate-500">
                  {user ? roleLabels[user.role] : ''}
                </span>
              </div>
              <button
                type="button"
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-rose-50 px-4 text-sm font-black text-rose-700 transition hover:bg-rose-100"
                onClick={() => void handleLogout()}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        )}

        {!isOnline && (
          <p
            role="status"
            className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-bold text-amber-900"
          >
            Mode hors ligne · consultation des dernières données enregistrées · les nouvelles
            alertes restent disponibles dans les brouillons
          </p>
        )}
      </header>

      {liveAnnouncement && (
        <aside
          className="fixed bottom-5 right-5 z-[60] w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-slate-900/20"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 font-black text-emerald-800">
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                Nouvelle notification
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                {liveAnnouncement}
              </p>
              <button
                type="button"
                className="mt-3 text-xs font-black text-teal-800 underline underline-offset-4"
                onClick={() => {
                  setLiveAnnouncement(null);
                  void navigate('/notifications');
                }}
              >
                Ouvrir les notifications
              </button>
            </div>
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setLiveAnnouncement(null)}
              aria-label="Fermer la notification"
            >
              ×
            </button>
          </div>
        </aside>
      )}

      <main className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
