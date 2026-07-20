const TOKEN_KEY = 'sahel-signal.access-token';

export interface TokenStorage {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export const tokenStorage: TokenStorage = {
  get: () => getSessionStorage()?.getItem(TOKEN_KEY) ?? null,
  set: (token) => getSessionStorage()?.setItem(TOKEN_KEY, token),
  clear: () => getSessionStorage()?.removeItem(TOKEN_KEY),
};
