import type { CreateReportInput, ReportPriority } from '../models';

export interface OfflineDraft {
  clientSubmissionId: string;
  title?: string;
  description?: string;
  categoryId?: number;
  territoryId?: number;
  locationText?: string | null;
  priority?: ReportPriority;
  compressedPhoto?: Blob;
  consentAccepted: boolean;
  updatedAt: string;
}

export type SyncState = 'pending' | 'syncing' | 'failed' | 'blocked';

export interface SyncQueueItem {
  id: string;
  clientSubmissionId: string;
  operation: 'report.create';
  payload: CreateReportInput;
  state: SyncState;
  attempts: number;
  createdAt: string;
  nextAttemptAt: string;
  lastError?: string;
}

export interface SyncSummary {
  processed: number;
  succeeded: number;
  failed: number;
  blocked: number;
}
