import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAuth } from '../../../app/providers/use-auth';
import type { Notification } from '../../../models';
import { notificationService, queryKeys, toApiError } from '../../../services';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function NotificationCard({
  notification,
  updating,
  onRead,
}: {
  notification: Notification;
  updating: boolean;
  onRead: () => void;
}) {
  return (
    <li
      className={`relative overflow-hidden rounded-[1.35rem] border p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] transition sm:p-6 ${
        notification.is_read
          ? 'border-slate-200 bg-white'
          : 'border-teal-200 bg-gradient-to-r from-teal-50/90 to-white'
      }`}
    >
      {!notification.is_read && (
        <span className="absolute inset-y-0 left-0 w-1 bg-teal-500" aria-hidden="true" />
      )}
      <div className="flex items-start gap-4">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${
            notification.is_read ? 'bg-slate-100 text-slate-500' : 'bg-teal-700 text-white'
          }`}
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`text-xs font-black uppercase tracking-[0.13em] ${
                notification.is_read ? 'text-slate-400' : 'text-teal-700'
              }`}
            >
              {notification.is_read ? 'Information consultée' : 'Nouvelle information'}
            </span>
            <time className="text-xs font-semibold text-slate-400">
              {formatDate(notification.created_at)}
            </time>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
            {notification.message}
          </p>
          {!notification.is_read && (
            <button
              type="button"
              className="mt-4 text-sm font-black text-teal-700 transition hover:text-teal-950"
              disabled={updating}
              onClick={onRead}
            >
              {updating ? 'Mise à jour…' : 'Marquer comme lue'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'all' | 'unread'>('all');
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

  const visibleNotifications = useMemo(
    () =>
      (notifications.data ?? []).filter((notification) => view === 'all' || !notification.is_read),
    [notifications.data, view],
  );

  if (notifications.isPending) {
    return (
      <section className="animate-pulse" aria-busy="true" aria-label="Chargement des notifications">
        <div className="h-60 rounded-[2rem] bg-slate-200" />
        <div className="mt-6 grid gap-4">
          <div className="h-40 rounded-2xl bg-white" />
          <div className="h-40 rounded-2xl bg-white" />
        </div>
      </section>
    );
  }

  if (!user) return null;

  if (notifications.isError) {
    return (
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-black text-slate-950">Notifications indisponibles</h1>
        <p role="alert" className="mt-2 text-slate-600">
          {toApiError(notifications.error).message}
        </p>
        <button
          type="button"
          className="button-primary mt-6"
          onClick={() => void notifications.refetch()}
        >
          Réessayer
        </button>
      </section>
    );
  }

  const unreadCount =
    notifications.data?.filter((notification) => !notification.is_read).length ?? 0;
  const roleContext = {
    citizen: 'Suivez les nouvelles concernant vos signalements et leur traitement.',
    agent: 'Recevez les consignes et mises à jour liées à vos interventions terrain.',
    manager: 'Centralisez les événements qui demandent une attention de pilotage.',
  }[user.role];

  return (
    <section className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 px-6 py-8 text-white shadow-[0_28px_80px_-36px_rgba(6,78,59,0.8)] sm:px-9 sm:py-10">
        <div
          className="absolute -right-16 -top-28 size-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Centre d’information
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              Notifications
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-100/75 sm:text-base">
              {roleContext}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
            <p className="text-xs font-bold text-teal-100/70">Non lues</p>
            <p className="mt-1 text-3xl font-black text-white">{unreadCount}</p>
          </div>
        </div>
      </div>

      {markAsRead.isError && (
        <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 font-bold text-rose-800">
          {toApiError(markAsRead.error).message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-black transition ${
              view === 'all' ? 'bg-teal-800 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => setView('all')}
          >
            Toutes ({notifications.data?.length ?? 0})
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-black transition ${
              view === 'unread' ? 'bg-teal-800 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => setView('unread')}
          >
            Non lues ({unreadCount})
          </button>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          Les informations les plus récentes sont affichées en premier.
        </p>
      </div>

      {visibleNotifications.length === 0 ? (
        <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-3xl text-emerald-700">
            ✓
          </span>
          <h2 className="mt-5 text-xl font-black text-slate-950">
            {view === 'unread' ? 'Vous êtes à jour' : 'Aucune notification'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {view === 'unread'
              ? 'Toutes vos informations ont été consultées.'
              : 'Les prochaines mises à jour apparaîtront dans cet espace.'}
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4">
          {visibleNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              updating={markAsRead.isPending && markAsRead.variables === notification.id}
              onRead={() => markAsRead.mutate(notification.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
