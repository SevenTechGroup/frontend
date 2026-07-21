import type { AuthResponse, LoginInput, RegisterInput, User } from '../models';
import { offlineDataCache } from '../offline/offline-data-cache';
import { authSession } from '../security/auth-session';
import { httpClient } from './api/http-client';

class AuthService {
  async login(input: LoginInput): Promise<User> {
    const { data } = await httpClient.post<AuthResponse>('/auth/login', input);
    authSession.set(data.token, data.user);
    return data.user;
  }

  async register(input: RegisterInput): Promise<User> {
    const { data } = await httpClient.post<AuthResponse>('/auth/register', input);
    authSession.set(data.token, data.user);
    return data.user;
  }

  async me(): Promise<User> {
    const { data } = await httpClient.get<{ user: User }>('/auth/me');
    authSession.updateUser(data.user);
    return data.user;
  }

  async logout(): Promise<void> {
    const userId = authSession.getUser()?.id;

    try {
      await httpClient.post('/auth/logout');
    } finally {
      if (userId !== undefined) {
        await offlineDataCache.clearUser(userId).catch(() => undefined);
      }
      authSession.clear();
    }
  }
}

export const authService = new AuthService();
