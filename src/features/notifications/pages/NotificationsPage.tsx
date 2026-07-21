import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNetworkStatus } from '../../../offline';
import { notificationService, queryKeys, toApiError } from '../../../services';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMessage(message: string): string {
  return message
    .replace(/\bdossiers\b/gi, 'signalements')
    .replace(/\bdossier\b/gi, 'signalement')
    .trim();
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const notifications = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationService.list(),
  });
  const markAsRead = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
  });

  const unreadCount =
    notifications.data?.filter((notification) => !notification.is_read).length ?? 0;
  const visibleNotifications = useMemo(
    () =>
      (notifications.data ?? []).filter(
        (notification) => filter === 'all' || !notification.is_read,
      ),
    [filter, notifications.data],
  );

  return (
    <section>
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 p-6 text-white shadow-xl sm:p-9">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Centre d’information
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Notifications</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-100/80">
              Suivez les changements importants concernant vos signalements et interventions.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-center">
            <strong className="block text-2xl font-black">{unreadCount}</strong>
            <span className="text-xs font-bold text-teal-100">
              non lue{unreadCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <div className="app-card mt-6 flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="app-eyebrow">Boîte de réception</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {notifications.data?.length ?? 0} notification
            {(notifications.data?.length ?? 0) > 1 ? 's' : ''} · {unreadCount} non lue
            {unreadCount > 1 ? 's' : ''}
          </p>
        </div>
        <div
          className="inline-flex rounded-xl bg-slate-100 p-1"
          aria-label="Filtrer les notifications"
        >
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-black transition ${
              filter === 'all' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'
            }`}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Toutes
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-black transition ${
              filter === 'unread' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'
            }`}
            aria-pressed={filter === 'unread'}
            onClick={() => setFilter('unread')}
          >
            Non lues
          </button>
        </div>
      </div>

      {!isOnline && unreadCount > 0 && (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
        >
          Les notifications restent consultables hors ligne. Reconnectez-vous pour enregistrer leur
          lecture.
        </p>
      )}

      {markAsRead.isError && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-900"
        >
          {toApiError(markAsRead.error).message}
        </p>
      )}

      {notifications.isPending ? (
        <div className="mt-6 grid gap-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : notifications.isError ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert">
          <p className="font-semibold text-rose-900">{toApiError(notifications.error).message}</p>
          <button className="button-secondary mt-4" onClick={() => void notifications.refetch()}>
            Réessayer
          </button>
        </div>
      ) : notifications.data.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center font-semibold text-slate-500">
          Aucune notification pour le moment.
        </p>
      ) : visibleNotifications.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50 p-10 text-center">
          <p className="font-black text-emerald-900">Tout est à jour</p>
          <p className="mt-2 text-sm text-emerald-700">Vous n’avez aucune notification non lue.</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {visibleNotifications.map((notification) => {
            const isUpdating = markAsRead.isPending && markAsRead.variables === notification.id;
            return (
              <li
                key={notification.id}
                className={`rounded-2xl border p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6 ${
                  notification.is_read
                    ? 'border-slate-200 bg-white'
                    : 'border-amber-200 bg-amber-50/70'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                        notification.is_read
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                      aria-hidden="true"
                    >
                      {notification.is_read ? '✓' : '!'}
                    </span>
                    <div className="min-w-0">
                      <p className="break-words font-bold leading-6 text-slate-900">
                        {formatMessage(notification.message)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          {formatDate(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-800">
                            Nouvelle
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button
                      type="button"
                      className="button-secondary w-full text-sm sm:w-auto"
                      disabled={!isOnline || isUpdating}
                      onClick={() => markAsRead.mutate(notification.id)}
                    >
                      {isUpdating ? 'Mise à jour…' : 'Marquer comme lue'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
