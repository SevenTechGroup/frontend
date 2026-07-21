import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import type { Assignment, AssignmentStatus } from '../../../models';
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
      setNotice('L’affectation a été créée et l’agent a été notifié.');
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
      setError('Sélectionnez un signalement et un agent.');
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
            ? 'Répartissez les signalements et suivez leur exécution par les agents.'
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
                Vue manager
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Créer une affectation</h2>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">
              Manager uniquement
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label>
              <span className="text-sm font-black text-slate-700">Signalement</span>
              <select
                className="field"
                value={reportId}
                disabled={reports.isPending || createAssignment.isPending}
                onChange={(event) => setReportId(event.target.value)}
              >
                <option value="">Choisir un dossier</option>
                {reports.data?.map((report) => (
                  <option key={report.id} value={report.id}>
                    #{report.id} · {report.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-sm font-black text-slate-700">Agent responsable</span>
              <select
                className="field"
                value={agentId}
                disabled={agents.isPending || createAssignment.isPending}
                onChange={(event) => setAgentId(event.target.value)}
              >
                <option value="">Choisir un agent</option>
                {agents.data?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} · {agent.email}
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
                disabled={createAssignment.isPending}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              className="button-primary w-full sm:w-auto"
              disabled={createAssignment.isPending}
            >
              {createAssignment.isPending ? 'Création…' : 'Affecter le dossier'}
            </button>
          </div>
        </form>
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
          {assignments.data?.length ?? 0}
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
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                      Affectation #{assignment.id}
                    </p>
                    <h3 className="mt-1 break-words text-lg font-black text-slate-950">
                      {assignment.report?.title ?? `Dossier #${assignment.report_id}`}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${statusMeta[assignment.status].className}`}
                  >
                    {statusMeta[assignment.status].label}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-400">Agent</dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {assignment.user?.name ?? `Agent #${assignment.user_id}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase text-slate-400">Créée le</dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {formatDate(assignment.created_at)}
                    </dd>
                  </div>
                </dl>
                {assignment.notes && (
                  <p className="mt-4 rounded-xl border border-slate-100 p-3 text-sm leading-6 text-slate-600">
                    {assignment.notes}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <Link
                    className="button-secondary inline-flex w-full items-center justify-center sm:w-auto"
                    to={`/signalements/${assignment.report_id}`}
                  >
                    Voir le dossier
                  </Link>
                  {transition && (
                    <button
                      className="button-primary w-full sm:w-auto"
                      disabled={isUpdating}
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
