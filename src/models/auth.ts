export const USER_ROLES = ['citizen', 'agent', 'manager'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}
