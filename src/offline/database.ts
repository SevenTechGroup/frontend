import Dexie, { type EntityTable } from 'dexie';
import type { OfflineDraft, SyncQueueItem } from './types';

class SahelSignalDatabase extends Dexie {
  drafts!: EntityTable<OfflineDraft, 'clientSubmissionId'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;

  constructor() {
    super('sahel-signal');

    this.version(1).stores({
      drafts: '&clientSubmissionId, updatedAt',
      syncQueue: '&id, &clientSubmissionId, state, nextAttemptAt, createdAt',
    });
  }
}

export const offlineDatabase = new SahelSignalDatabase();
