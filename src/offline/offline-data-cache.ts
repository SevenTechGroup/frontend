import { authSession } from '../security/auth-session';
import { offlineDatabase } from './database';
import type { OfflineApiCacheEntry } from './types';

function currentUserId(): number | null {
  return authSession.getUser()?.id ?? null;
}

function cacheKey(resource: string, userId: number | null): string {
  return `${userId === null ? 'public' : `user-${userId}`}::${resource}`;
}

async function storeForUser<T>(resource: string, value: T, userId: number | null): Promise<void> {
  const entry: OfflineApiCacheEntry = {
    key: cacheKey(resource, userId),
    userId,
    resource,
    value,
    updatedAt: new Date().toISOString(),
  };

  await offlineDatabase.apiCache.put(entry);
}

function canUseFallback(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;

  if (typeof error !== 'object' || error === null || !('status' in error)) return false;

  const status = (error as { status?: unknown }).status;
  return status === null || (typeof status === 'number' && status >= 500);
}

export const offlineDataCache = {
  async store<T>(resource: string, value: T): Promise<void> {
    await storeForUser(resource, value, currentUserId());
  },

  async read<T>(resource: string): Promise<T | undefined> {
    const entry = await offlineDatabase.apiCache.get(cacheKey(resource, currentUserId()));
    return entry?.value as T | undefined;
  },

  async remember<T>(resource: string, fetcher: () => Promise<T>): Promise<T> {
    const userId = currentUserId();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const entry = await offlineDatabase.apiCache.get(cacheKey(resource, userId));
        if (entry) return entry.value as T;
      } catch {
        // Le message explicite ci-dessous couvre aussi une indisponibilité d’IndexedDB.
      }

      throw new Error(
        'Aucune donnée enregistrée n’est disponible pour cet écran. Reconnectez-vous une première fois pour préparer le mode hors ligne.',
      );
    }

    try {
      const value = await fetcher();

      try {
        await storeForUser(resource, value, userId);
      } catch {
        // Une indisponibilité du stockage local ne doit jamais bloquer les données réseau.
      }

      return value;
    } catch (error) {
      if (!canUseFallback(error)) throw error;

      try {
        const entry = await offlineDatabase.apiCache.get(cacheKey(resource, userId));
        const cached = entry?.value as T | undefined;
        if (cached !== undefined) return cached;
      } catch {
        // L’erreur réseau originale est plus utile si IndexedDB est indisponible.
      }

      throw error;
    }
  },

  async clearUser(userId: number): Promise<void> {
    await offlineDatabase.apiCache.where('userId').equals(userId).delete();
  },
};
