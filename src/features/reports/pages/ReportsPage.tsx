import { useQuery } from '@tanstack/react-query';
import { queryKeys, reportService, toApiError } from '../../../services';

const statusLabels = {
  received: 'Reçu',
  in_progress: 'En cours',
  resolved: 'Résolu',
} as const;

export function ReportsPage() {
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: () => reportService.list() });

  if (reports.isPending) return <p aria-busy="true">Chargement des signalements…</p>;
  if (reports.isError) return <p role="alert">{toApiError(reports.error).message}</p>;

  return (
    <section>
      <h1 className="page-title">Signalements</h1>
      {reports.data.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-5 text-slate-600">Aucun signalement visible.</p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {reports.data.map((report) => (
            <li
              key={report.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                    Dossier #{report.id}
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{report.title}</h2>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
                  {statusLabels[report.status]}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-slate-600">{report.description}</p>
              <p className="mt-4 text-sm text-slate-500">
                {report.category?.name ?? 'Catégorie non chargée'} ·{' '}
                {report.territory?.name ?? 'Territoire non chargé'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
