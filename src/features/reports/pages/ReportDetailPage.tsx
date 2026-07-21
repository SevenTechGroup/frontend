import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import type { ReportPriority, ReportStatus, UpdateReportInput } from '../../../models';
import { useNetworkStatus } from '../../../offline';
import { can } from '../../../security/authorization';
import { queryKeys, reportService, toApiError } from '../../../services';
import { ReportPhoto } from '../components/ReportPhoto';

const statusMeta: Record<ReportStatus, { label: string; className: string }> = {
  received: { label: 'Reçu', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  in_progress: { label: 'En cours', className: 'bg-amber-50 text-amber-900 ring-amber-200' },
  resolved: { label: 'Résolu', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
};

const priorityLabels: Record<ReportPriority, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
};

const statusSteps: Array<{ value: ReportStatus; label: string; detail: string }> = [
  { value: 'received', label: 'Reçu', detail: 'Le signalement a été enregistré.' },
  { value: 'in_progress', label: 'En cours', detail: 'Une équipe traite la situation.' },
  { value: 'resolved', label: 'Résolu', detail: 'L’intervention a été terminée.' },
];

function nextStatus(status: ReportStatus): ReportStatus | null {
  if (status === 'received') return 'in_progress';
  if (status === 'in_progress') return 'resolved';
  return null;
}

function actionErrorMessage(caught: unknown): string {
  const error = toApiError(caught);
  const firstFieldMessage = Object.values(error.fieldErrors).flat()[0];

  if (error.status === 403) {
    return 'Action refusée : votre rôle ne permet pas de modifier ce signalement.';
  }
  if (error.status === 422) {
    return firstFieldMessage ?? `Modification refusée : ${error.message}`;
  }
  return error.message;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function ReportDetailPage() {
  const { reportId: reportIdParam } = useParams();
  const reportId = Number(reportIdParam);
  const validReportId = Number.isInteger(reportId) && reportId > 0;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const [selectedPriority, setSelectedPriority] = useState<ReportPriority>('medium');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const report = useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => reportService.get(reportId),
    enabled: validReportId,
  });
  const canUpdate = can(user, 'report:update');

  useEffect(() => {
    if (report.data) setSelectedPriority(report.data.priority);
  }, [report.data]);

  const updateReport = useMutation({
    mutationFn: (input: UpdateReportInput) => reportService.update(reportId, input),
    onMutate: () => {
      setActionError(null);
      setNotice(null);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.report(reportId), updated);
      setSelectedPriority(updated.priority);
      setNotice('Le signalement a été mis à jour avec succès.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);
    },
    onError: (caught) => setActionError(actionErrorMessage(caught)),
  });

  if (!validReportId) {
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
        <h1 className="text-xl font-black text-rose-950">Lien de signalement invalide</h1>
        <Link className="mt-4 inline-block font-black text-teal-800 underline" to="/signalements">
          Retour aux signalements
        </Link>
      </section>
    );
  }

  if (report.isPending) {
    return (
      <section aria-busy="true" aria-label="Chargement du signalement" className="animate-pulse">
        <div className="h-64 rounded-[2rem] bg-slate-200" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="h-96 rounded-2xl bg-white" />
          <div className="h-80 rounded-2xl bg-white" />
        </div>
      </section>
    );
  }

  if (report.isError) {
    const error = toApiError(report.error);
    return (
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
        <h1 className="text-xl font-black text-rose-950">
          {error.status === 403 ? 'Signalement non autorisé' : 'Signalement indisponible'}
        </h1>
        <p className="mt-2 text-rose-800">
          {error.status === 403
            ? 'Votre rôle ne permet pas de consulter ce signalement.'
            : error.message}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="button-secondary inline-flex items-center" to="/signalements">
            Retour à la liste
          </Link>
          {error.status !== 403 && (
            <button className="button-primary" type="button" onClick={() => void report.refetch()}>
              Réessayer
            </button>
          )}
        </div>
      </section>
    );
  }

  const current = report.data;
  const transition = nextStatus(current.status);
  const photos = (current.attachments ?? []).filter((attachment) =>
    attachment.mime_type.startsWith('image/'),
  );
  const mapUrl = current.location
    ? `https://www.openstreetmap.org/?mlat=${current.location.latitude}&mlon=${current.location.longitude}#map=17/${current.location.latitude}/${current.location.longitude}`
    : null;
  const currentStatusIndex = statusSteps.findIndex((step) => step.value === current.status);

  return (
    <section>
      <Link
        to="/signalements"
        className="inline-flex items-center gap-2 text-sm font-black text-teal-800 underline underline-offset-4"
      >
        <span aria-hidden="true">←</span>
        Retour aux signalements
      </Link>

      <header className="mt-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 p-6 text-white shadow-xl sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Fiche de signalement
            </p>
            <h1 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">
              {current.title}
            </h1>
            <p className="mt-3 text-sm font-semibold text-teal-100/75">
              Créé le {formatDate(current.created_at)}
            </p>
          </div>
          <span
            aria-label={`Statut actuel : ${statusMeta[current.status].label}`}
            className={`rounded-full px-4 py-2 text-sm font-black ring-1 ring-inset ${statusMeta[current.status].className}`}
          >
            {statusMeta[current.status].label}
          </span>
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 font-semibold text-teal-900"
        >
          {notice}
        </p>
      )}
      {actionError && (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-900"
        >
          {actionError}
        </p>
      )}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {photos.length > 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                Preuve photographique
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Photo transmise avec le signalement
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Cette image documente la situation observée sur le terrain. Son accès est réservé
                aux utilisateurs autorisés à consulter ce signalement.
              </p>
              <div className="mt-5 grid gap-4">
                {photos.map((attachment, index) => (
                  <ReportPhoto
                    key={attachment.id}
                    attachment={attachment}
                    alt={`Preuve photographique ${index + 1} du signalement « ${current.title} »`}
                    variant="detail"
                  />
                ))}
              </div>
            </article>
          )}

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
              Description
            </p>
            <h2 className="sr-only">Description du signalement</h2>
            <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-700">
              {current.description}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">Contexte</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Localisation et classement</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Catégorie
                </dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {current.category?.name ?? 'Non renseignée'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Territoire
                </dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {current.territory?.name ?? 'Non renseigné'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Repère déclaré
                </dt>
                <dd className="mt-1 font-bold text-slate-900">
                  {current.location_text || 'Aucun repère indiqué'}
                </dd>
              </div>
              {current.location && mapUrl && (
                <div className="sm:col-span-2 rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
                  <dt className="text-xs font-bold uppercase tracking-wide text-teal-700">
                    Position GPS autorisée
                  </dt>
                  <dd className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      Localisation disponible · précision d’environ{' '}
                      {Math.round(current.location.accuracy_m)} m
                    </span>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-teal-800 shadow-sm ring-1 ring-teal-200 transition hover:bg-teal-100"
                    >
                      Ouvrir sur la carte
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
              Déclaré par
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              {current.user?.name ?? 'Identité non disponible'}
            </h2>
            {current.user?.email ? (
              <a
                className="mt-2 inline-block break-all text-sm font-semibold text-teal-700 underline decoration-teal-200 underline-offset-4"
                href={`mailto:${current.user.email}`}
              >
                {current.user.email}
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Adresse non disponible</p>
            )}
          </article>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">Traitement</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Suivi du signalement</h2>

          <ol className="mt-5 space-y-1" aria-label="Progression du traitement">
            {statusSteps.map((step, index) => {
              const completed = index <= currentStatusIndex;
              const active = index === currentStatusIndex;

              return (
                <li key={step.value} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < statusSteps.length - 1 && (
                    <span
                      className={`absolute left-[0.7rem] top-6 h-[calc(100%-0.35rem)] w-0.5 ${index < currentStatusIndex ? 'bg-teal-500' : 'bg-slate-200'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-black ring-4 ring-white ${
                      completed ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                    aria-hidden="true"
                  >
                    {completed ? '✓' : index + 1}
                  </span>
                  <span>
                    <strong
                      className={`block text-sm font-black ${active ? 'text-teal-800' : 'text-slate-800'}`}
                    >
                      {step.label}
                    </strong>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {step.detail}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Priorité</p>
            {canUpdate ? (
              <div className="mt-2">
                <label className="sr-only" htmlFor="report-priority">
                  Priorité du signalement
                </label>
                <select
                  id="report-priority"
                  className="field mt-0"
                  value={selectedPriority}
                  disabled={!isOnline || updateReport.isPending}
                  onChange={(event) => setSelectedPriority(event.target.value as ReportPriority)}
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
                <button
                  type="button"
                  className="button-secondary mt-3 w-full"
                  disabled={
                    !isOnline || updateReport.isPending || selectedPriority === current.priority
                  }
                  onClick={() => updateReport.mutate({ priority: selectedPriority })}
                >
                  Enregistrer la priorité
                </button>
              </div>
            ) : (
              <p className="mt-1 font-black text-slate-900">{priorityLabels[current.priority]}</p>
            )}
          </div>

          {canUpdate ? (
            <div className="mt-5 border-t border-slate-100 pt-5">
              {transition ? (
                <button
                  type="button"
                  className="button-primary w-full"
                  disabled={!isOnline || updateReport.isPending}
                  onClick={() => updateReport.mutate({ status: transition })}
                >
                  {updateReport.isPending
                    ? 'Mise à jour…'
                    : transition === 'in_progress'
                      ? 'Passer en traitement'
                      : 'Marquer comme résolu'}
                </button>
              ) : (
                <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  Ce signalement est résolu. Aucune transition supplémentaire n’est autorisée.
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Le suivi n’est actualisé qu’après confirmation du serveur.
              </p>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Consultation en lecture seule pour votre rôle.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
