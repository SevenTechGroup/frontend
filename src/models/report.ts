import type { User } from './auth';

export const REPORT_PRIORITIES = ['low', 'medium', 'high'] as const;
export const REPORT_STATUSES = ['received', 'in_progress', 'resolved'] as const;

export type ReportPriority = (typeof REPORT_PRIORITIES)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ReportLocation {
  id: number;
  report_id: number;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ReportAttachment {
  id: number;
  report_id: number;
  provider: string;
  resource_type: string;
  delivery_type: string;
  format: string | null;
  mime_type: string;
  original_filename: string;
  bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  severity: string | number;
  description: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Territory {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Report {
  id: number;
  user_id: number;
  category_id: number;
  territory_id: number;
  title: string;
  description: string;
  location_text: string | null;
  priority: ReportPriority;
  status: ReportStatus;
  category?: Category;
  territory?: Territory;
  user?: User;
  attachments?: ReportAttachment[];
  location?: ReportLocation | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReportInput {
  title: string;
  description: string;
  category_id: number;
  territory_id: number;
  location_text?: string | null;
  priority?: ReportPriority;
}

export interface CreateReportEvidence {
  photo?: Blob | null;
  coordinates?: ReportCoordinates | null;
  locationConsentAccepted?: boolean;
}

export interface UpdateReportInput {
  status?: ReportStatus;
  priority?: ReportPriority;
}
