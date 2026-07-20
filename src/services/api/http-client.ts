import axios from 'axios';
import { env } from '../../config/env';
import { authSession } from '../../security/auth-session';
import { toApiError } from './api-error';

export const AUTH_UNAUTHORIZED_EVENT = 'sahel-signal:unauthorized';

export const httpClient = axios.create({
  baseURL: env.VITE_API_URL.replace(/\/$/, ''),
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const token = authSession.getToken();

  config.headers.set('X-Request-ID', crypto.randomUUID());
  if (token) config.headers.set('Authorization', `Bearer ${token}`);

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && authSession.getToken()) {
      authSession.clear();
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    return Promise.reject(toApiError(error));
  },
);
