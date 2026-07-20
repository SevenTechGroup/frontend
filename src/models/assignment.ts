import type { User } from './auth';
import type { Report } from './report';

export const ASSIGNMENT_STATUSES = ['assigned', 'in_progress', 'completed'] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface Assignment {
  id: number;
  report_id: number;
  user_id: number;
  notes: string | null;
  status: AssignmentStatus;
  report?: Report;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface CreateAssignmentInput {
  report_id: number;
  user_id: number;
  notes?: string | null;
}

export interface UpdateAssignmentInput {
  status?: AssignmentStatus;
  notes?: string | null;
}
