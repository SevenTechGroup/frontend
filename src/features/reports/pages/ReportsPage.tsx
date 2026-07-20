import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import { getRoleInterface } from '../../../config/role-interface';
import type { Report, ReportPriority, ReportStatus } from '../../../models';
import { queryKeys, reportService, toApiError } from '../../../services';

const statusPresentation: Record<ReportStatus, { label: string; className: string; dot: string }> =
  {
    received: {
      label: 'Reçu',
      className: 'bg-sky-50 text-sky-800 ring-sky-200',
      dot: 'bg-sky-500',
    },
    in_progress: {
      label: 'En cours',
      className: 'bg-amber-50 text-amber-900 ring-amber-200',
      dot: 'bg-amber-500',
    },
    resolved: {
      label: 'Résolu',
      className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      dot: 'bg-emerald-500',
    },
  };

const priorityPresentation: Record<ReportPriority, { label: string; className: string }> = {
  low: { label: 'Faible', className: 'text-slate-600 bg-slate-100' },
  medium: { label: 'Modérée', className: 'text-orange-800 bg-orange-50' },
  high: { label: 'Haute priorité', className: 'text-rose-800 bg-rose-50' },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ReportIcon({ name }: { name: 'search' | 'pin' | 'calendar' | 'folder' | 'user' }) {
  const paths = {
    search: 'm21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
    pin: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    calendar: 'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
    folder: 'M3 6h7l2 2h9v11H3V6Z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 0 0-14 0',
  } as const;

  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function ReportCard({ report, showOwner }: { report: Report; showOwner: boolean }) {
  const status = statusPresentation[report.status];
  const priority = priorityPresentation[report.priority];

  return (
    <li className="group overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_50px_-40px_rgba(15,23,42,0.55)] transition duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_24px_60px_-38px_rgba(13,148,136,0.35)]">
      <article className="grid h-full md:grid-cols-[0.45rem_1fr]">
        <span
          className={
            report.priority === 'high'
              ? 'bg-rose-500'
              : report.priority === 'medium'
                ? 'bg-amber-400'
                : 'bg-teal-500'
          }
          aria-hidden="true"
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                  Dossier #{report.id}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[0.7rem] font-black ${priority.className}`}
                >
                  {priority.label}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-black leading-snug text-slate-950 transition group-hover:text-teal-800">
                {report.title}
              </h2>
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ring-inset ${status.className}`}
            >
              <span className={`size-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{report.description}</p>

          <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
            <span className="flex items-center gap-2">
              <ReportIcon name="folder" />
              {report.category?.name ?? 'Catégorie non renseignée'}
            </span>
            <span className="flex items-center gap-2">
              <ReportIcon name="pin" />
              {report.territory?.name ?? report.location_text ?? 'Zone non renseignée'}
            </span>
            <span className="flex items-center gap-2">
              <ReportIcon name="calendar" />
              {formatDate(report.created_at)}
            </span>
            {showOwner && (
              <span className="flex items-center gap-2">
                <ReportIcon name="user" />
                {report.user?.name ?? `Citoyen #${report.user_id}`}
              </span>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}

function ReportsSkeleton() {
  return (
    <section aria-busy="true" aria-label="Chargement des signalements" className="animate-pulse">
      <div className="h-64 rounded-[2rem] bg-slate-200" />
      <div className="mt-6 h-24 rounded-2xl bg-white" />
      <div className="mt-5 grid gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-52 rounded-2xl bg-white" />
        ))}
      </div>
    </section>
  );
}

export function ReportsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | ReportStatus>('all');
  const [priority, setPriority] = useState<'all' | ReportPriority>('all');
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: () => reportService.list() });

  const filteredReports = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    return (reports.data ?? []).filter((report) => {
      const matchesSearch =
        needle.length === 0 ||
        [
          report.title,
          report.description,
          report.location_text,
          report.category?.name,
          report.territory?.name,
          report.user?.name,
          String(report.id),
        ].some((value) => value?.toLocaleLowerCase('fr').includes(needle));
      return (
        matchesSearch &&
        (status === 'all' || report.status === status) &&
        (priority === 'all' || report.priority === priority)
      );
    });
  }, [priority, reports.data, search, status]);

  if (reports.isPending) return <ReportsSkeleton />;
  if (!user) return null;

  const roleInterface = getRoleInterface(user.role);
  const totals = {
    all: reports.data?.length ?? 0,
    received: reports.data?.filter((report) => report.status === 'received').length ?? 0,
    inProgress: reports.data?.filter((report) => report.status === 'in_progress').length ?? 0,
    resolved: reports.data?.filter((report) => report.status === 'resolved').length ?? 0,
  };

  if (reports.isError) {
    return (
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-xl">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-2xl font-black text-rose-700">
          !
        </span>
        <h1 className="mt-4 text-2xl font-black text-slate-950">Signalements indisponibles</h1>
        <p role="alert" className="mt-2 text-slate-600">
          {toApiError(reports.error).message}
        </p>
        <button
          className="button-primary mt-6"
          type="button"
          onClick={() => void reports.refetch()}
        >
          Réessayer
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.8)] sm:px-9 sm:py-10">
        <div
          className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.28),transparent_68%)]"
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-7">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              {roleInterface.reports.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
              {roleInterface.reports.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {roleInterface.reports.description}
            </p>
          </div>
          {user.role === 'citizen' && (
            <Link
              to="/signalements/nouveau"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-amber-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              <span className="text-xl leading-none">+</span>
              Nouveau signalement
            </Link>
          )}
        </div>

        <dl className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Total', totals.all],
            ['Reçus', totals.received],
            ['En cours', totals.inProgress],
            ['Résolus', totals.resolved],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
            >
              <dt className="text-xs font-bold text-slate-400">{label}</dt>
              <dd className="mt-1 text-2xl font-black text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="sticky top-24 z-20 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.5)] backdrop-blur">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
          <label className="relative block">
            <span className="sr-only">Rechercher un signalement</span>
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <ReportIcon name="search" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Titre, dossier, catégorie, zone…"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer par statut</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | ReportStatus)}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="all">Tous les statuts</option>
              <option value="received">Reçus</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolus</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrer par priorité</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as 'all' | ReportPriority)}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="all">Toutes les priorités</option>
              <option value="high">Haute priorité</option>
              <option value="medium">Priorité modérée</option>
              <option value="low">Priorité faible</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">
          {filteredReports.length} dossier{filteredReports.length > 1 ? 's' : ''} affiché
          {filteredReports.length > 1 ? 's' : ''}
        </p>
        {(search || status !== 'all' || priority !== 'all') && (
          <button
            type="button"
            className="text-sm font-black text-teal-700 hover:text-teal-900"
            onClick={() => {
              setSearch('');
              setStatus('all');
              setPriority('all');
            }}
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {filteredReports.length === 0 ? (
        <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-50 text-3xl text-teal-700">
            ◎
          </span>
          <h2 className="mt-5 text-xl font-black text-slate-950">
            {totals.all === 0 ? roleInterface.reports.emptyTitle : 'Aucun résultat correspondant'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {totals.all === 0
              ? roleInterface.reports.emptyDescription
              : 'Modifiez votre recherche ou réinitialisez les filtres pour retrouver les dossiers.'}
          </p>
          {totals.all === 0 && user.role === 'citizen' && (
            <Link to="/signalements/nouveau" className="button-primary mt-6 inline-flex">
              Créer mon premier signalement
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-5 grid gap-4">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} showOwner={user.role === 'manager'} />
          ))}
        </ul>
      )}
    </section>
  );
}
