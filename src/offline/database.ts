import Dexie, { type EntityTable } from 'dexie';
import type { OfflineApiCacheEntry, OfflineDraft, SyncQueueItem } from './types';

class SahelSignalDatabase extends Dexie {
  drafts!: EntityTable<OfflineDraft, 'clientSubmissionId'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  apiCache!: EntityTable<OfflineApiCacheEntry, 'key'>;

  constructor() {
    super('sahel-signal');

    this.version(1).stores({
      drafts: '&clientSubmissionId, updatedAt',
      syncQueue: '&id, &clientSubmissionId, state, nextAttemptAt, createdAt',
    });

    this.version(2).stores({
      drafts: '&clientSubmissionId, updatedAt',
      syncQueue: '&id, &clientSubmissionId, state, nextAttemptAt, createdAt',
      apiCache: '&key, userId, resource, updatedAt',
    });
  }
}

export const offlineDatabase = new SahelSignalDatabase();
