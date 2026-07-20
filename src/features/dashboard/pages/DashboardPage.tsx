import { useQuery } from '@tanstack/react-query';
import { dashboardService, queryKeys, toApiError } from '../../../services';

export function DashboardPage() {
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => dashboardService.get(),
  });

  if (dashboard.isPending) return <p aria-busy="true">Chargement du tableau de bord…</p>;
  if (dashboard.isError) {
    return <p role="alert">{toApiError(dashboard.error).message}</p>;
  }

  const cards = [
    ['Signalements visibles', dashboard.data.total_reports],
    ['Affectations visibles', dashboard.data.total_assignments],
    ['Notifications non lues', dashboard.data.unread_notifications],
    ['Mes signalements', dashboard.data.my_reports],
    ['Mes affectations', dashboard.data.my_assignments],
  ];

  return (
    <section>
      <h1 className="page-title">Tableau de bord</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-2 text-3xl font-black text-teal-800">{value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
