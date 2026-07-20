import { offlineDatabase } from './database';
import type { OfflineDraft } from './types';

class DraftRepository {
  async list(): Promise<OfflineDraft[]> {
    return offlineDatabase.drafts.orderBy('updatedAt').reverse().toArray();
  }

  async get(clientSubmissionId: string): Promise<OfflineDraft | undefined> {
    return offlineDatabase.drafts.get(clientSubmissionId);
  }

  async save(draft: Omit<OfflineDraft, 'updatedAt'>): Promise<OfflineDraft> {
    const persisted = { ...draft, updatedAt: new Date().toISOString() };
    await offlineDatabase.drafts.put(persisted);
    return persisted;
  }

  async remove(clientSubmissionId: string): Promise<void> {
    await offlineDatabase.drafts.delete(clientSubmissionId);
  }
}

export const draftRepository = new DraftRepository();
