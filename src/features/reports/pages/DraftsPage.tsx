import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  draftRepository,
  syncService,
  useNetworkStatus,
  type OfflineDraft,
  type SyncQueueItem,
} from '../../../offline';
import { queryKeys, toApiError } from '../../../services';

const queueState = {
  pending: { label: 'En attente', className: 'bg-amber-50 text-amber-800' },
  syncing: { label: 'Envoi en cours', className: 'bg-sky-50 text-sky-800' },
  failed: { label: 'Échec temporaire', className: 'bg-rose-50 text-rose-800' },
  blocked: { label: 'Correction requise', className: 'bg-violet-50 text-violet-800' },
} as const;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function DraftCard({ draft, onDelete }: { draft: OfflineDraft; onDelete: () => void }) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
            Brouillon local
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {draft.title || 'Signalement sans titre'}
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {formatDate(draft.updatedAt)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
        {draft.description || 'La description reste à compléter.'}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to={`/signalements/nouveau?brouillon=${encodeURIComponent(draft.clientSubmissionId)}`}
          className="button-primary inline-flex items-center justify-center text-sm"
        >
          Reprendre
        </Link>
        <button type="button" className="button-secondary text-sm text-rose-700" onClick={onDelete}>
          Supprimer
        </button>
      </div>
    </article>
  );
}

function QueueCard({
  item,
  draft,
  syncEnabled,
  onRetry,
  onRemove,
}: {
  item: SyncQueueItem;
  draft: OfflineDraft | undefined;
  syncEnabled: boolean;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const state = queueState[item.state];
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">Soumission différée</p>
          <h3 className="mt-1 font-black text-slate-950">{item.payload.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${state.className}`}>
          {state.label}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
        <div>
          <dt className="font-bold text-slate-400">Tentatives</dt>
          <dd className="mt-1 font-black text-slate-800">{item.attempts}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-400">Prochain essai</dt>
          <dd className="mt-1 font-black text-slate-800">{formatDate(item.nextAttemptAt)}</dd>
        </div>
      </dl>
      {item.evidence && (item.evidence.photo || item.evidence.coordinates) && (
        <p className="mt-3 text-xs font-bold text-teal-800">
          {[
            item.evidence.photo ? 'Photo jointe' : null,
            item.evidence.coordinates ? 'Position précise' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      {item.lastError && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800"
        >
          {item.lastError}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {item.state === 'blocked' && draft && (
          <Link
            to={`/signalements/nouveau?brouillon=${encodeURIComponent(item.clientSubmissionId)}`}
            className="button-primary inline-flex items-center text-sm"
          >
            Corriger le brouillon
          </Link>
        )}
        {item.state === 'failed' && (
          <button
            type="button"
            className="button-primary text-sm"
            disabled={!syncEnabled}
            title={syncEnabled ? undefined : 'Synchronisation indisponible dans cet environnement'}
            onClick={onRetry}
          >
            Réessayer maintenant
          </button>
        )}
        <button type="button" className="button-secondary text-sm" onClick={onRemove}>
          Retirer de la file
        </button>
      </div>
    </li>
  );
}

export function DraftsPage() {
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const syncEnabled = syncService.isAutomaticSyncEnabled();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const drafts = useQuery({ queryKey: queryKeys.drafts, queryFn: () => draftRepository.list() });
  const queue = useQuery({ queryKey: queryKeys.syncQueue, queryFn: () => syncService.list() });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.drafts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.syncQueue }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
    ]);
  };

  const deleteDraft = async (draft: OfflineDraft) => {
    if (!window.confirm('Supprimer définitivement ce brouillon de cet appareil ?')) return;
    setError(null);
    try {
      await Promise.all([
        draftRepository.remove(draft.clientSubmissionId),
        syncService.removeBySubmission(draft.clientSubmissionId),
      ]);
      setNotice('Le brouillon et son éventuel envoi différé ont été supprimés.');
      await refresh();
    } catch (caught) {
      setError(toApiError(caught).message);
    }
  };

  const retry = async (item: SyncQueueItem) => {
    setError(null);
    setNotice(null);
    try {
      await syncService.retry(item.id);
      const summary = await syncService.synchronize();
      setNotice(
        summary.succeeded > 0
          ? 'Le signalement a été envoyé avec succès.'
          : 'La nouvelle tentative est programmée.',
      );
      await refresh();
    } catch (caught) {
      setError(toApiError(caught).message);
    }
  };

  const removeFromQueue = async (item: SyncQueueItem) => {
    if (!window.confirm('Retirer cet envoi de la file ? Le brouillon sera conservé.')) return;
    await syncService.remove(item.id);
    setNotice('L’envoi a été retiré ; le brouillon reste disponible.');
    await refresh();
  };

  const loading = drafts.isPending || queue.isPending;
  const queryError = drafts.error ?? queue.error;
  const draftBySubmission = new Map(
    drafts.data?.map((draft) => [draft.clientSubmissionId, draft]) ?? [],
  );

  return (
    <section className="mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 p-6 text-white shadow-xl sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Mode résilient
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Brouillons et envois
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-100/80">
              Reprenez une saisie interrompue et suivez les signalements conservés lorsque le réseau
              est instable.
            </p>
          </div>
          <span
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${
              isOnline ? 'bg-emerald-300/15 text-emerald-100' : 'bg-amber-300/15 text-amber-100'
            }`}
          >
            <span
              className={`size-2.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
            {isOnline ? 'Connexion disponible' : 'Hors ligne'}
          </span>
        </div>
      </div>

      {!syncEnabled && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Envoi automatique temporairement indisponible.</strong> Vos brouillons restent
          enregistrés sur cet appareil. Vous pourrez les reprendre et les envoyer dès que ce service
          sera disponible.
        </div>
      )}
      {notice && (
        <p role="status" className="mt-5 rounded-2xl bg-teal-50 p-4 font-semibold text-teal-900">
          {notice}
        </p>
      )}
      {(error || queryError) && (
        <p role="alert" className="mt-5 rounded-2xl bg-rose-50 p-4 font-semibold text-rose-800">
          {error ?? toApiError(queryError).message}
        </p>
      )}

      {loading ? (
        <p className="mt-8 rounded-2xl bg-white p-6 text-slate-500" aria-busy="true">
          Chargement des données locales…
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          <section aria-labelledby="drafts-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                  Sur cet appareil
                </p>
                <h2 id="drafts-title" className="mt-1 text-2xl font-black text-slate-950">
                  Brouillons
                </h2>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black text-slate-700">
                {drafts.data?.length ?? 0} brouillon
                {(drafts.data?.length ?? 0) > 1 ? 's' : ''}
              </span>
            </div>
            {drafts.data?.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {drafts.data.map((draft) => (
                  <DraftCard
                    key={draft.clientSubmissionId}
                    draft={draft}
                    onDelete={() => void deleteDraft(draft)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-bold text-slate-800">Aucun brouillon enregistré</p>
                <Link
                  to="/signalements/nouveau"
                  className="mt-3 inline-block font-black text-teal-700 underline underline-offset-4"
                >
                  Créer un signalement
                </Link>
              </div>
            )}
          </section>

          <section aria-labelledby="queue-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">
                  Synchronisation
                </p>
                <h2 id="queue-title" className="mt-1 text-2xl font-black text-slate-950">
                  File d’envoi
                </h2>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-black text-slate-700">
                {queue.data?.length ?? 0} en attente
              </span>
            </div>
            {queue.data?.length ? (
              <ul className="mt-5 grid gap-4">
                {queue.data.map((item) => (
                  <QueueCard
                    key={item.id}
                    item={item}
                    draft={draftBySubmission.get(item.clientSubmissionId)}
                    syncEnabled={syncEnabled && isOnline}
                    onRetry={() => void retry(item)}
                    onRemove={() => void removeFromQueue(item)}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center font-semibold text-slate-500">
                Aucun envoi en attente.
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
