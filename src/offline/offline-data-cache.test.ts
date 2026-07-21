import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../models';
import { authSession } from '../security/auth-session';
import { offlineDatabase } from './database';
import { offlineDataCache } from './offline-data-cache';

const manager: User = {
  id: 12,
  name: 'Aminata Ndiaye',
  email: 'aminata@example.test',
  role: 'manager',
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('offlineDataCache', () => {
  beforeEach(async () => {
    await offlineDatabase.apiCache.clear();
    authSession.clear();
    authSession.set('test-token', manager);
    setOnline(true);
  });

  it('enregistre une réponse réseau puis la restitue lorsque la connexion est coupée', async () => {
    await expect(
      offlineDataCache.remember('dashboard', () => Promise.resolve({ total_reports: 9 })),
    ).resolves.toEqual({ total_reports: 9 });

    setOnline(false);

    await expect(
      offlineDataCache.remember('dashboard', () =>
        Promise.reject(new Error('Réseau indisponible')),
      ),
    ).resolves.toEqual({ total_reports: 9 });
  });

  it('isole strictement les données entre deux comptes', async () => {
    await offlineDataCache.store('assignments', [{ id: 1, title: 'Intervention Dakar' }]);

    authSession.set('second-token', { ...manager, id: 99, email: 'autre@example.test' });
    setOnline(false);

    await expect(
      offlineDataCache.remember('assignments', () =>
        Promise.reject(new Error('Réseau indisponible')),
      ),
    ).rejects.toThrow('Aucune donnée enregistrée');
  });

  it('supprime les données locales du compte lors de la déconnexion', async () => {
    await offlineDataCache.store('notifications', [{ id: 3, message: 'Nouveau dossier' }]);

    await offlineDataCache.clearUser(manager.id);

    await expect(offlineDataCache.read('notifications')).resolves.toBeUndefined();
  });
});
