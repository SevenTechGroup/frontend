import { beforeEach, describe, expect, it } from 'vitest';
import { offlineDatabase } from './database';
import { nextAttempt, syncService } from './sync.service';

const payload = {
  title: 'Route inondée',
  description: 'La route est impraticable depuis les fortes pluies.',
  category_id: 1,
  territory_id: 2,
  priority: 'medium' as const,
};

describe('SyncService', () => {
  beforeEach(async () => {
    await offlineDatabase.syncQueue.clear();
  });

  it('met à jour une soumission existante sans créer de doublon', async () => {
    await syncService.enqueueReport('submission-1', payload);
    await syncService.enqueueReport('submission-1', {
      ...payload,
      title: 'Route toujours inondée',
    });

    const items = await syncService.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.payload.title).toBe('Route toujours inondée');
  });

  it('applique un délai exponentiel plafonné à quinze minutes', () => {
    const now = Date.parse('2026-07-20T12:00:00.000Z');

    expect(Date.parse(nextAttempt(1, now)) - now).toBe(2_000);
    expect(Date.parse(nextAttempt(4, now)) - now).toBe(16_000);
    expect(Date.parse(nextAttempt(20, now)) - now).toBe(15 * 60 * 1_000);
  });
});
