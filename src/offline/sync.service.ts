import { env } from '../config/env';
import type { CreateReportInput } from '../models';
import { reportService, toApiError } from '../services';
import { offlineDatabase } from './database';
import type { SyncQueueItem, SyncSummary } from './types';

const MAX_BACKOFF_MS = 15 * 60 * 1000;

function nextAttempt(attempts: number): string {
  const delay = Math.min(2 ** attempts * 1_000, MAX_BACKOFF_MS);
  return new Date(Date.now() + delay).toISOString();
}

class SyncService {
  private activeRun: Promise<SyncSummary> | null = null;

  async enqueueReport(clientSubmissionId: string, payload: CreateReportInput): Promise<void> {
    const now = new Date().toISOString();
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      clientSubmissionId,
      operation: 'report.create',
      payload,
      state: 'pending',
      attempts: 0,
      createdAt: now,
      nextAttemptAt: now,
    };

    await offlineDatabase.syncQueue.put(item);
  }

  synchronize(): Promise<SyncSummary> {
    if (!env.VITE_ENABLE_OFFLINE_SYNC || !navigator.onLine) {
      return Promise.resolve({ processed: 0, succeeded: 0, failed: 0, blocked: 0 });
    }

    this.activeRun ??= this.run().finally(() => {
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
        await reportService.create(item.payload, item.clientSubmissionId);
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
}

export const syncService = new SyncService();
