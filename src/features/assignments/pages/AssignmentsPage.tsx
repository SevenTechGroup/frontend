import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useAuth } from '../../../app/providers/use-auth';
import type { Assignment, AssignmentStatus } from '../../../models';
import { assignmentService, queryKeys, toApiError } from '../../../services';

const statusPresentation: Record<
  AssignmentStatus,
  { label: string; className: string; next?: AssignmentStatus; action?: string }
> = {
  assigned: {
    label: 'À démarrer',
    className: 'bg-sky-50 text-sky-800 ring-sky-200',
    next: 'in_progress',
    action: 'Démarrer l’intervention',
  },
  in_progress: {
    label: 'En intervention',
    className: 'bg-amber-50 text-amber-900 ring-amber-200',
    next: 'completed',
    action: 'Marquer comme terminée',
  },
  completed: {
    label: 'Terminée',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

function AssignmentIcon({ name }: { name: 'briefcase' | 'pin' | 'user' | 'clock' | 'search' }) {
  const paths = {
    briefcase: 'M8 6V4h8v2m-5 6h2M4 7h16v13H4V7Zm0 4c5 3 11 3 16 0',
    pin: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 0 0-14 0',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v6l4 2',
    search: 'm21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
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

function AssignmentCard({
  assignment,
  isManager,
  updating,
  onAdvance,
}: {
  assignment: Assignment;
  isManager: boolean;
  updating: boolean;
  onAdvance: () => void;
}) {
  const state = statusPresentation[assignment.status];

  return (
    <li className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_50px_-40px_rgba(15,23,42,0.55)] transition hover:border-teal-300">
      <article className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
              Mission #{assignment.id} · Dossier #{assignment.report_id}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              {assignment.report?.title ?? 'Intervention terrain'}
            </h2>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black ring-1 ring-inset ${state.className}`}
          >
            {state.label}
          </span>
        </div>

        {assignment.report?.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {assignment.report.description}
          </p>
        )}

        {assignment.notes && (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-amber-800">
              Consigne opérationnelle
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-950">{assignment.notes}</p>
          </div>
        )}

        <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
          <span className="flex items-center gap-2">
            <AssignmentIcon name="briefcase" />
            {assignment.report?.category?.name ?? 'Catégorie à confirmer'}
          </span>
          <span className="flex items-center gap-2">
            <AssignmentIcon name="pin" />
            {assignment.report?.territory?.name ??
              assignment.report?.location_text ??
              'Zone à confirmer'}
          </span>
          <span className="flex items-center gap-2">
            <AssignmentIcon name="clock" />
            Affectée le {formatDate(assignment.created_at)}
          </span>
          {isManager && (
            <span className="flex items-center gap-2">
              <AssignmentIcon name="user" />
              {assignment.user?.name ?? `Agent #${assignment.user_id}`}
            </span>
          )}
        </div>

        {state.next && (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="button-primary min-w-48"
              disabled={updating}
              onClick={onAdvance}
            >
              {updating ? 'Mise à jour…' : state.action}
            </button>
          </div>
        )}
      </article>
    </li>
  );
}

export function AssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | AssignmentStatus>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const assignments = useQuery({
    queryKey: queryKeys.assignments,
    queryFn: () => assignmentService.list(),
  });
  const updateAssignment = useMutation({
    mutationFn: ({ id, nextStatus }: { id: number; nextStatus: AssignmentStatus }) =>
      assignmentService.update(id, { status: nextStatus }),
    onSuccess: async (updated) => {
      setNotice(`La mission #${updated.id} a été mise à jour.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.assignments }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
  });

  const filteredAssignments = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    return (assignments.data ?? []).filter((assignment) => {
      const matchesSearch =
        needle.length === 0 ||
        [
          assignment.report?.title,
          assignment.report?.description,
          assignment.report?.territory?.name,
          assignment.user?.name,
          assignment.notes,
          String(assignment.id),
          String(assignment.report_id),
        ].some((value) => value?.toLocaleLowerCase('fr').includes(needle));
      return matchesSearch && (status === 'all' || assignment.status === status);
    });
  }, [assignments.data, search, status]);

  if (assignments.isPending) {
    return (
      <section className="animate-pulse" aria-busy="true" aria-label="Chargement des affectations">
        <div className="h-64 rounded-[2rem] bg-slate-200" />
        <div className="mt-6 h-24 rounded-2xl bg-white" />
        <div className="mt-5 h-64 rounded-2xl bg-white" />
      </section>
    );
  }

  if (!user) return null;

  const isManager = user.role === 'manager';
  const allAssignments = assignments.data ?? [];
  const totals = {
    all: allAssignments.length,
    assigned: allAssignments.filter((assignment) => assignment.status === 'assigned').length,
    inProgress: allAssignments.filter((assignment) => assignment.status === 'in_progress').length,
    completed: allAssignments.filter((assignment) => assignment.status === 'completed').length,
  };

  if (assignments.isError) {
    return (
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-xl">
        <h1 className="text-2xl font-black text-slate-950">Affectations indisponibles</h1>
        <p role="alert" className="mt-2 text-slate-600">
          {toApiError(assignments.error).message}
        </p>
        <button
          type="button"
          className="button-primary mt-6"
          onClick={() => void assignments.refetch()}
        >
          Réessayer
        </button>
      </section>
    );
  }

  return (
    <section>
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 py-8 text-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.85)] sm:px-9 sm:py-10">
        <div
          className="absolute -right-20 -top-28 size-80 rounded-full border border-teal-300/10"
          aria-hidden="true"
        />
        <div className="relative max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            {isManager ? 'Coordination des équipes' : 'Exécution terrain'}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            {isManager ? 'Pilotage des affectations' : 'Mes interventions'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            {isManager
              ? 'Suivez l’avancement des missions, la charge des agents et les interventions clôturées.'
              : 'Retrouvez vos consignes, démarrez vos missions et confirmez leur réalisation depuis le terrain.'}
          </p>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Total', totals.all],
            ['À démarrer', totals.assigned],
            ['En intervention', totals.inProgress],
            ['Terminées', totals.completed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <dt className="text-xs font-bold text-slate-400">{label}</dt>
              <dd className="mt-1 text-2xl font-black">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {notice && (
        <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">
          {notice}
        </p>
      )}
      {updateAssignment.isError && (
        <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 font-bold text-rose-800">
          {toApiError(updateAssignment.error).message}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.5)]">
        <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
          <label className="relative block">
            <span className="sr-only">Rechercher une affectation</span>
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <AssignmentIcon name="search" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mission, dossier, territoire, agent…"
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <label>
            <span className="sr-only">Filtrer par statut</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'all' | AssignmentStatus)}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="all">Toutes les missions</option>
              <option value="assigned">À démarrer</option>
              <option value="in_progress">En intervention</option>
              <option value="completed">Terminées</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">
          {filteredAssignments.length} mission{filteredAssignments.length > 1 ? 's' : ''}
        </p>
        {(search || status !== 'all') && (
          <button
            type="button"
            className="text-sm font-black text-teal-700"
            onClick={() => {
              setSearch('');
              setStatus('all');
            }}
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {filteredAssignments.length === 0 ? (
        <div className="mt-5 rounded-[1.75rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-teal-50 text-3xl text-teal-700">
            ✓
          </span>
          <h2 className="mt-5 text-xl font-black text-slate-950">Aucune mission à afficher</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {totals.all === 0
              ? 'Les nouvelles affectations apparaîtront automatiquement dans cet espace.'
              : 'Modifiez vos filtres pour retrouver une autre intervention.'}
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-4">
          {filteredAssignments.map((assignment) => {
            const nextStatus = statusPresentation[assignment.status].next;
            return (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                isManager={isManager}
                updating={
                  updateAssignment.isPending && updateAssignment.variables?.id === assignment.id
                }
                onAdvance={() => {
                  if (!nextStatus) return;
                  setNotice(null);
                  updateAssignment.mutate({ id: assignment.id, nextStatus });
                }}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
