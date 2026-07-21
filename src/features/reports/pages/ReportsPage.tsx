import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import type { Report, ReportPriority, ReportStatus } from '../../../models';
import { useNetworkStatus } from '../../../offline';
import { can } from '../../../security/authorization';
import { queryKeys, reportService, toApiError } from '../../../services';
import { ReportPhoto } from '../components/ReportPhoto';

const statusMeta: Record<ReportStatus, { label: string; className: string }> = {
  received: { label: 'Reçu', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  in_progress: { label: 'En cours', className: 'bg-amber-50 text-amber-900 ring-amber-200' },
  resolved: { label: 'Résolu', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
};

const priorityMeta: Record<ReportPriority, { label: string; className: string }> = {
  low: { label: 'Faible', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Moyenne', className: 'bg-orange-50 text-orange-800' },
  high: { label: 'Haute', className: 'bg-rose-50 text-rose-800' },
};

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function nextStatus(report: Report): ReportStatus | null {
  if (report.status === 'received') return 'in_progress';
  if (report.status === 'in_progress') return 'resolved';
  return null;
}

function LoadingState() {
  return (
    <section aria-busy="true" aria-label="Chargement des signalements">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="mt-6 grid gap-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
    </section>
  );
}

export function ReportsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ReportStatus>('all');
  const [priority, setPriority] = useState<'all' | ReportPriority>('all');
  const [territoryId, setTerritoryId] = useState('all');
  const [mutationError, setMutationError] = useState<string | null>(null);
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: () => reportService.list() });
  const canManageReports = can(user, 'report:update');

  const updateStatus = useMutation({
    mutationFn: ({ reportId, status: next }: { reportId: number; status: ReportStatus }) =>
      reportService.update(reportId, { status: next }),
    onMutate: () => setMutationError(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: (caught) => setMutationError(toApiError(caught).message),
  });

  const territories = useMemo(() => {
    const byId = new Map<number, string>();
    reports.data?.forEach((report) => {
      if (report.territory) byId.set(report.territory.id, report.territory.name);
    });
    return [...byId.entries()].sort((left, right) => left[1].localeCompare(right[1], 'fr'));
  }, [reports.data]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = normalize(search.trim());

    return (reports.data ?? []).filter((report) => {
      const searchable = normalize(
        [
          report.title,
          report.description,
          report.location_text,
          report.category?.name,
          report.territory?.name,
        ]
          .filter(Boolean)
          .join(' '),
      );

      return (
        (!normalizedSearch || searchable.includes(normalizedSearch)) &&
        (status === 'all' || report.status === status) &&
        (priority === 'all' || report.priority === priority) &&
        (territoryId === 'all' || String(report.territory_id) === territoryId)
      );
    });
  }, [priority, reports.data, search, status, territoryId]);

  const hasActiveFilters =
    search.trim() !== '' || status !== 'all' || priority !== 'all' || territoryId !== 'all';

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setPriority('all');
    setTerritoryId('all');
  };

  if (reports.isPending) return <LoadingState />;

  if (reports.isError) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
        <h1 className="text-xl font-black text-rose-950">Impossible de charger les signalements</h1>
        <p className="mt-2 text-sm text-rose-800">{toApiError(reports.error).message}</p>
        <button
          type="button"
          className="button-secondary mt-5"
          onClick={() => void reports.refetch()}
        >
          Réessayer
        </button>
      </section>
    );
  }

  return (
    <section>
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 p-6 text-white shadow-xl sm:p-9">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              {canManageReports ? 'Espace opérationnel' : 'Espace citoyen'}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {canManageReports ? 'Signalements à traiter' : 'Mes signalements'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-100/80">
              {canManageReports
                ? 'Recherchez, filtrez et faites avancer les signalements qui vous sont accessibles.'
                : 'Consultez les signalements que vous avez transmis et leur état de traitement.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-center backdrop-blur">
            <strong className="block text-2xl font-black">{reports.data.length}</strong>
            <span className="text-xs font-bold text-teal-100">signalements visibles</span>
          </div>
        </div>
      </header>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.5fr)_repeat(3,minmax(9rem,0.7fr))]">
          <label className="md:col-span-2 xl:col-span-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Recherche
            </span>
            <span className="relative mt-1 block">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="search"
                className="field mt-0 pl-10"
                placeholder="Titre, lieu, catégorie ou territoire…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </span>
          </label>

          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Statut
            </span>
            <select
              className="field"
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | ReportStatus)}
            >
              <option value="all">Tous les statuts</option>
              <option value="received">Reçu</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
            </select>
          </label>

          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Priorité
            </span>
            <select
              className="field"
              value={priority}
              onChange={(event) => setPriority(event.target.value as 'all' | ReportPriority)}
            >
              <option value="all">Toutes les priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Faible</option>
            </select>
          </label>

          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Territoire
            </span>
            <select
              className="field"
              value={territoryId}
              onChange={(event) => setTerritoryId(event.target.value)}
            >
              <option value="all">Tous les territoires</option>
              {territories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-500" aria-live="polite">
            {filteredReports.length} résultat{filteredReports.length > 1 ? 's' : ''}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="text-sm font-black text-teal-700 underline underline-offset-4"
              onClick={resetFilters}
            >
              Effacer les filtres
            </button>
          )}
        </div>
      </div>

      {mutationError && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-900"
        >
          {mutationError}
        </p>
      )}

      {reports.data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-black text-slate-900">Aucun signalement visible</h2>
          <p className="mt-2 text-sm text-slate-500">
            Les nouveaux signalements apparaîtront ici dès qu’ils seront disponibles pour votre
            rôle.
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-black text-slate-900">Aucun résultat pour ces filtres</h2>
          <p className="mt-2 text-sm text-slate-500">
            Modifiez la recherche ou réinitialisez les filtres.
          </p>
          <button type="button" className="button-secondary mt-5" onClick={resetFilters}>
            Réinitialiser
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-5 xl:grid-cols-2">
          {filteredReports.map((report) => {
            const transition = nextStatus(report);
            const primaryPhoto = report.attachments?.find((attachment) =>
              attachment.mime_type.startsWith('image/'),
            );
            const isUpdating =
              updateStatus.isPending && updateStatus.variables?.reportId === report.id;

            return (
              <li
                key={report.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                      {report.category?.name ?? 'Signalement citoyen'}
                    </p>
                    <h2 className="mt-1 break-words text-xl font-black text-slate-950">
                      {report.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${statusMeta[report.status].className}`}
                    >
                      {statusMeta[report.status].label}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${priorityMeta[report.priority].className}`}
                    >
                      {priorityMeta[report.priority].label}
                    </span>
                  </div>
                </div>

                {primaryPhoto && (
                  <figure className="mt-4">
                    <ReportPhoto
                      attachment={primaryPhoto}
                      alt={`Preuve photographique du signalement « ${report.title} »`}
                    />
                    <figcaption className="mt-2 text-xs font-bold text-slate-500">
                      Photo transmise par le citoyen avec ce signalement.
                    </figcaption>
                  </figure>
                )}

                <p className="mt-4 line-clamp-3 break-words text-sm leading-6 text-slate-600">
                  {report.description}
                </p>

                <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Catégorie
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {report.category?.name ?? 'Non renseignée'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Territoire
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {report.territory?.name ?? 'Non renseigné'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Lieu
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {report.location_text || 'Aucun repère indiqué'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Créé le
                    </dt>
                    <dd className="mt-1 font-bold text-slate-800">
                      {formatDate(report.created_at)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <Link
                    to={`/signalements/${report.id}`}
                    className="button-secondary inline-flex w-full items-center justify-center sm:w-auto"
                  >
                    Consulter le signalement
                  </Link>
                  {canManageReports && transition && (
                    <button
                      type="button"
                      className="button-primary w-full sm:w-auto"
                      disabled={!isOnline || isUpdating}
                      onClick={() =>
                        updateStatus.mutate({ reportId: report.id, status: transition })
                      }
                    >
                      {isUpdating
                        ? 'Mise à jour…'
                        : transition === 'in_progress'
                          ? 'Prendre en charge'
                          : 'Marquer comme résolu'}
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
