import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '../../../offline';
import { notificationService, queryKeys, toApiError } from '../../../services';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
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
              Suivez les changements importants concernant vos dossiers et interventions.
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
      ) : (
        <ul className="mt-6 grid gap-3">
          {notifications.data.map((notification) => {
            const isUpdating = markAsRead.isPending && markAsRead.variables === notification.id;
            return (
              <li
                key={notification.id}
                className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${
                  notification.is_read
                    ? 'border-slate-200 bg-white'
                    : 'border-amber-200 bg-amber-50/70'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span
                      className={`mt-1 size-2.5 shrink-0 rounded-full ${
                        notification.is_read ? 'bg-slate-300' : 'bg-amber-500'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="break-words font-bold leading-6 text-slate-900">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {formatDate(notification.created_at)}
                      </p>
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
