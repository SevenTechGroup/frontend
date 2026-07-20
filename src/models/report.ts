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

export interface UpdateReportInput {
  status?: ReportStatus;
  priority?: ReportPriority;
}
