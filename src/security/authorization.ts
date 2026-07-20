import type { User, UserRole } from '../models';

const permissions = {
  'report:create': ['citizen', 'agent', 'manager'],
  'report:view': ['citizen', 'agent', 'manager'],
  'report:update': ['agent', 'manager'],
  'assignment:view': ['agent', 'manager'],
  'assignment:create': ['manager'],
  'assignment:update': ['agent', 'manager'],
  'administration:view': ['manager'],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof permissions;

export function hasRole(user: User | null, allowedRoles: readonly UserRole[]): boolean {
  return user !== null && allowedRoles.includes(user.role);
}

export function can(user: User | null, permission: Permission): boolean {
  return hasRole(user, permissions[permission]);
}
