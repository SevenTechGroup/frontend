import { env } from '../config/env';
import type { CreateReportEvidence, CreateReportInput } from '../models';
import { reportService, toApiError } from '../services';
import { offlineDatabase } from './database';
import type { SyncQueueItem, SyncSummary } from './types';

const MAX_BACKOFF_MS = 15 * 60 * 1000;

export function nextAttempt(attempts: number, now = Date.now()): string {
  const delay = Math.min(2 ** attempts * 1_000, MAX_BACKOFF_MS);
  return new Date(now + delay).toISOString();
}

class SyncService {
  private activeRun: Promise<SyncSummary> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  async enqueueReport(
    clientSubmissionId: string,
    payload: CreateReportInput,
    evidence?: CreateReportEvidence,
  ): Promise<void> {
    const now = new Date().toISOString();
    const existing = await offlineDatabase.syncQueue
      .where('clientSubmissionId')
      .equals(clientSubmissionId)
      .first();
    const item: SyncQueueItem = {
      id: existing?.id ?? crypto.randomUUID(),
      clientSubmissionId,
      operation: 'report.create',
      payload,
      ...(evidence ? { evidence } : {}),
      state: 'pending',
      attempts: existing?.attempts ?? 0,
      createdAt: existing?.createdAt ?? now,
      nextAttemptAt: now,
    };

    await offlineDatabase.syncQueue.put(item);
    await this.scheduleNextRun();
  }

  async list(): Promise<SyncQueueItem[]> {
    return offlineDatabase.syncQueue.orderBy('createdAt').reverse().toArray();
  }

  async retry(id: string): Promise<void> {
    await offlineDatabase.syncQueue.update(id, {
      state: 'pending',
      nextAttemptAt: new Date().toISOString(),
      lastError: '',
    });
    await this.scheduleNextRun();
  }

  async remove(id: string): Promise<void> {
    await offlineDatabase.syncQueue.delete(id);
    await this.scheduleNextRun();
  }

  async removeBySubmission(clientSubmissionId: string): Promise<void> {
    await offlineDatabase.syncQueue.where('clientSubmissionId').equals(clientSubmissionId).delete();
    await this.scheduleNextRun();
  }

  isAutomaticSyncEnabled(): boolean {
    return env.VITE_ENABLE_OFFLINE_SYNC;
  }

  synchronize(): Promise<SyncSummary> {
    if (!env.VITE_ENABLE_OFFLINE_SYNC || !navigator.onLine) {
      return Promise.resolve({ processed: 0, succeeded: 0, failed: 0, blocked: 0 });
    }

    this.activeRun ??= this.run()
      .then(async (summary) => {
        await this.scheduleNextRun();
        return summary;
      })
      .finally(() => {
        this.activeRun = null;
      });

    return this.activeRun;
  }

  private async run(): Promise<SyncSummary> {
    const now = new Date().toISOString();
    const items = await offlineDatabase.syncQueue
      .filter(
        (item) =>
          ['pending', 'failed'].includes(item.state) && item.nextAttemptAt.localeCompare(now) <= 0,
      )
      .toArray();
    const summary: SyncSummary = { processed: items.length, succeeded: 0, failed: 0, blocked: 0 };

    for (const item of items) {
      await offlineDatabase.syncQueue.update(item.id, { state: 'syncing' });

      try {
        await reportService.create(item.payload, item.clientSubmissionId, item.evidence);
        await offlineDatabase.transaction(
          'rw',
          offlineDatabase.syncQueue,
          offlineDatabase.drafts,
          async () => {
            await offlineDatabase.syncQueue.delete(item.id);
            await offlineDatabase.drafts.delete(item.clientSubmissionId);
          },
        );
        summary.succeeded += 1;
      } catch (error) {
        const apiError = toApiError(error);
        const retryable =
          apiError.status === null || apiError.status >= 500 || apiError.status === 429;
        const attempts = item.attempts + 1;

        await offlineDatabase.syncQueue.update(item.id, {
          state: retryable ? 'failed' : 'blocked',
          attempts,
          nextAttemptAt: nextAttempt(attempts),
          lastError: apiError.message,
        });

        if (retryable) summary.failed += 1;
        else summary.blocked += 1;
      }
    }

    return summary;
  }

  private async scheduleNextRun(): Promise<void> {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (!env.VITE_ENABLE_OFFLINE_SYNC || !navigator.onLine) return;

    const scheduled = await offlineDatabase.syncQueue
      .filter((item) => ['pending', 'failed'].includes(item.state))
      .sortBy('nextAttemptAt');
    const next = scheduled[0];
    if (!next) return;

    const delay = Math.max(Date.parse(next.nextAttemptAt) - Date.now(), 0);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.synchronize();
    }, delay);
  }
}

export const syncService = new SyncService();
