import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import type { Assignment, AssignmentStatus, ReportPriority } from '../../../models';
import { useNetworkStatus } from '../../../offline';
import { can } from '../../../security/authorization';
import {
  assignmentService,
  queryKeys,
  referenceService,
  reportService,
  toApiError,
} from '../../../services';

const statusMeta: Record<AssignmentStatus, { label: string; className: string }> = {
  assigned: { label: 'Assignée', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  in_progress: { label: 'En cours', className: 'bg-amber-50 text-amber-900 ring-amber-200' },
  completed: { label: 'Terminée', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
};

const priorityMeta: Record<ReportPriority, { label: string; className: string }> = {
  low: { label: 'Priorité faible', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Priorité moyenne', className: 'bg-orange-50 text-orange-800' },
  high: { label: 'Priorité haute', className: 'bg-rose-50 text-rose-800' },
};

function nextStatus(assignment: Assignment): AssignmentStatus | null {
  if (assignment.status === 'assigned') return 'in_progress';
  if (assignment.status === 'in_progress') return 'completed';
  return null;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function AssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const canCreate = can(user, 'assignment:create');
  const [reportId, setReportId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const assignments = useQuery({
    queryKey: queryKeys.assignments,
    queryFn: () => assignmentService.list(),
  });
  const reports = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => reportService.list(),
    enabled: canCreate,
  });
  const agents = useQuery({
    queryKey: queryKeys.agents,
    queryFn: () => referenceService.agents(),
    enabled: canCreate,
  });

  const refreshAfterAction = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
    ]);
  };

  const createAssignment = useMutation({
    mutationFn: () =>
      assignmentService.create({
        report_id: Number(reportId),
        user_id: Number(agentId),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    onMutate: () => {
      setError(null);
      setNotice(null);
    },
    onSuccess: async () => {
      setReportId('');
      setAgentId('');
      setNotes('');
      setNotice('L’affectation a été créée et l’intervenant a été notifié.');
      await refreshAfterAction();
    },
    onError: (caught) => setError(toApiError(caught).message),
  });

  const updateAssignment = useMutation({
    mutationFn: ({ id, status }: { id: number; status: AssignmentStatus }) =>
      assignmentService.update(id, { status }),
    onMutate: () => {
      setError(null);
      setNotice(null);
    },
    onSuccess: async () => {
      setNotice('L’état de l’affectation a été mis à jour.');
      await refreshAfterAction();
    },
    onError: (caught) => setError(toApiError(caught).message),
  });

  const submitAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportId || !agentId) {
      setError('Sélectionnez un signalement et un intervenant.');
      return;
    }
    createAssignment.mutate();
  };

  const referencesError = reports.error ?? agents.error;

  return (
    <section>
      <header className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 p-6 text-white shadow-xl sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
          Coordination terrain
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Affectations</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-100/80">
          {canCreate
            ? 'Répartissez les signalements et suivez leur exécution par les intervenants.'
            : 'Retrouvez les interventions qui vous sont confiées et faites-les avancer.'}
        </p>
      </header>

      {canCreate && (
        <form
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          onSubmit={submitAssignment}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                Espace responsable
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Créer une affectation</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">
              Réservé aux responsables
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label>
              <span className="text-sm font-black text-slate-700">Signalement</span>
              <select
                className="field"
                value={reportId}
                disabled={!isOnline || reports.isPending || createAssignment.isPending}
                onChange={(event) => setReportId(event.target.value)}
              >
                <option value="">Choisir un signalement</option>
                {reports.data?.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.title}
                    {report.territory?.name ? ` — ${report.territory.name}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-black text-slate-700">Intervenant responsable</span>
              <select
                className="field"
                value={agentId}
                disabled={!isOnline || agents.isPending || createAssignment.isPending}
                onChange={(event) => setAgentId(event.target.value)}
              >
                <option value="">Choisir un intervenant</option>
                {agents.data?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} — Intervenant terrain
                  </option>
                ))}
              </select>
            </label>
            <label className="lg:col-span-2">
              <span className="text-sm font-black text-slate-700">Instructions facultatives</span>
              <textarea
                className="field min-h-28 resize-y"
                maxLength={2000}
                value={notes}
                disabled={!isOnline || createAssignment.isPending}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              className="button-primary w-full sm:w-auto"
              disabled={!isOnline || createAssignment.isPending}
            >
              {createAssignment.isPending ? 'Création…' : 'Affecter l’intervention'}
            </button>
          </div>
        </form>
      )}

      {!isOnline && (
        <p
          role="status"
          className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900"
        >
          Les affectations enregistrées restent consultables hors ligne. Reconnectez-vous pour créer
          une affectation ou modifier son état.
        </p>
      )}

      {(error || referencesError) && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-900"
        >
          {error ?? toApiError(referencesError).message}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 font-semibold text-teal-900"
        >
          {notice}
        </p>
      )}

      <div className="mt-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
            Suivi opérationnel
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {canCreate ? 'Toutes les affectations' : 'Mes affectations'}
          </h2>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black text-slate-700">
          {assignments.data?.length ?? 0} affectation
          {(assignments.data?.length ?? 0) > 1 ? 's' : ''}
        </span>
      </div>

      {assignments.isPending ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2" aria-busy="true">
          {[1, 2].map((item) => (
            <div key={item} className="h-56 animate-pulse rounded-2xl bg-white" />
          ))}
        </div>
      ) : assignments.isError ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert">
          <p className="font-semibold text-rose-900">{toApiError(assignments.error).message}</p>
          <button className="button-secondary mt-4" onClick={() => void assignments.refetch()}>
            Réessayer
          </button>
        </div>
      ) : assignments.data.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center font-semibold text-slate-500">
          Aucune affectation visible pour le moment.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 lg:grid-cols-2">
          {assignments.data.map((assignment) => {
            const transition = nextStatus(assignment);
            const isUpdating =
              updateAssignment.isPending && updateAssignment.variables?.id === assignment.id;

            return (
              <li
                key={assignment.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                      Intervention terrain
                    </p>
                    <h3 className="mt-1 break-words text-lg font-black text-slate-950">
                      {assignment.report?.title ?? 'Signalement non disponible'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${statusMeta[assignment.status].className}`}
                    >
                      {statusMeta[assignment.status].label}
                    </span>
                    {assignment.report?.priority && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${priorityMeta[assignment.report.priority].className}`}
                      >
                        {priorityMeta[assignment.report.priority].label}
                      </span>
                    )}
                  </div>
                </div>
                <dl className="mt-4 grid gap-4 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-400">Intervenant</dt>
                    <dd className="mt-1 break-words font-bold text-slate-900">
                      {assignment.user?.name ?? 'Intervenant non renseigné'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-400">Territoire</dt>
                    <dd className="mt-1 break-words font-bold text-slate-900">
                      {assignment.report?.territory?.name ?? 'Non renseigné'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-400">Catégorie</dt>
                    <dd className="mt-1 break-words font-bold text-slate-900">
                      {assignment.report?.category?.name ?? 'Non renseignée'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-400">Affectée le</dt>
                    <dd className="mt-1 break-words font-bold text-slate-900">
                      {formatDate(assignment.created_at)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold uppercase text-slate-400">Lieu déclaré</dt>
                    <dd className="mt-1 break-words font-bold text-slate-900">
                      {assignment.report?.location_text || 'Aucun repère indiqué'}
                    </dd>
                  </div>
                </dl>
                {assignment.notes && (
                  <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-teal-700">
                      Instructions de l’intervention
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                      {assignment.notes}
                    </p>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <Link
                    className="button-secondary inline-flex w-full items-center justify-center sm:w-auto"
                    to={`/signalements/${assignment.report_id}`}
                  >
                    Voir le signalement
                  </Link>
                  {transition && (
                    <button
                      className="button-primary w-full sm:w-auto"
                      disabled={!isOnline || isUpdating}
                      onClick={() =>
                        updateAssignment.mutate({ id: assignment.id, status: transition })
                      }
                    >
                      {isUpdating
                        ? 'Mise à jour…'
                        : transition === 'in_progress'
                          ? 'Commencer'
                          : 'Terminer'}
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
