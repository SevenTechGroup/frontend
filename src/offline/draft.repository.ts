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
    const persisted: OfflineDraft = {
      clientSubmissionId: draft.clientSubmissionId,
      consentAccepted: draft.consentAccepted,
      updatedAt: new Date().toISOString(),
      ...(draft.title === undefined ? {} : { title: draft.title }),
      ...(draft.description === undefined ? {} : { description: draft.description }),
      ...(draft.categoryId === undefined ? {} : { categoryId: draft.categoryId }),
      ...(draft.territoryId === undefined ? {} : { territoryId: draft.territoryId }),
      ...(draft.locationText === undefined ? {} : { locationText: draft.locationText }),
      ...(draft.priority === undefined ? {} : { priority: draft.priority }),
      ...(draft.compressedPhoto === undefined ? {} : { compressedPhoto: draft.compressedPhoto }),
    };
    await offlineDatabase.drafts.put(persisted);
    return persisted;
  }

  async remove(clientSubmissionId: string): Promise<void> {
    await offlineDatabase.drafts.delete(clientSubmissionId);
  }
}

export const draftRepository = new DraftRepository();
