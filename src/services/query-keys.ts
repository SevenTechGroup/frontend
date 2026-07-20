export const queryKeys = {
  session: ['session'] as const,
  dashboard: ['dashboard'] as const,
  reports: ['reports'] as const,
  report: (id: number) => ['reports', id] as const,
  assignments: ['assignments'] as const,
  notifications: ['notifications'] as const,
  categories: ['references', 'categories'] as const,
  territories: ['references', 'territories'] as const,
  drafts: ['offline', 'drafts'] as const,
  syncQueue: ['offline', 'sync-queue'] as const,
};
