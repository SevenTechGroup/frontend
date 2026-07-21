import { Blob as NodeBlob } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { reportService } from '../services';
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
    vi.restoreAllMocks();
    await Promise.all([offlineDatabase.syncQueue.clear(), offlineDatabase.drafts.clear()]);
  });

  it('met à jour une soumission existante sans créer de doublon', async () => {
    await syncService.enqueueReport('submission-1', payload);
    // fake-indexeddb s'appuie sur structuredClone, qui sait cloner le Blob Node
    // alors que le polyfill Blob de jsdom est réduit à un objet vide.
    const photo = new NodeBlob(['preuve-photo'], { type: 'image/jpeg' }) as unknown as Blob;
    await syncService.enqueueReport(
      'submission-1',
      {
        ...payload,
        title: 'Route toujours inondée',
      },
      {
        photo,
        coordinates: { latitude: 14.7167, longitude: -17.4677, accuracy: 12 },
        locationConsentAccepted: true,
      },
    );

    const items = await syncService.list();
    expect(items).toHaveLength(1);
    expect(items[0]?.payload.title).toBe('Route toujours inondée');
    expect(items[0]?.evidence?.coordinates?.latitude).toBe(14.7167);
    expect(items[0]?.evidence?.photo).toMatchObject({
      size: photo.size,
      type: 'image/jpeg',
    });
  });

  it('applique un délai exponentiel plafonné à quinze minutes', () => {
    const now = Date.parse('2026-07-20T12:00:00.000Z');

    expect(Date.parse(nextAttempt(1, now)) - now).toBe(2_000);
    expect(Date.parse(nextAttempt(4, now)) - now).toBe(16_000);
    expect(Date.parse(nextAttempt(20, now)) - now).toBe(15 * 60 * 1_000);
  });

  it('transmet les preuves conservées lors de la synchronisation', async () => {
    const originalSyncSetting = env.VITE_ENABLE_OFFLINE_SYNC;
    const photo = new NodeBlob(['preuve-à-synchroniser'], {
      type: 'image/jpeg',
    }) as unknown as Blob;
    const evidence = {
      photo,
      coordinates: { latitude: 14.7167, longitude: -17.4677, accuracy: 9 },
      locationConsentAccepted: true,
    };
    const create = vi.spyOn(reportService, 'create').mockResolvedValue({} as never);
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);

    await offlineDatabase.syncQueue.put({
      id: 'queue-with-evidence',
      clientSubmissionId: 'submission-with-evidence',
      operation: 'report.create',
      payload,
      evidence,
      state: 'pending',
      attempts: 0,
      createdAt: '2026-07-20T12:00:00.000Z',
      nextAttemptAt: '2026-07-20T12:00:00.000Z',
    });

    env.VITE_ENABLE_OFFLINE_SYNC = true;
    try {
      await expect(syncService.synchronize()).resolves.toMatchObject({ succeeded: 1 });
    } finally {
      env.VITE_ENABLE_OFFLINE_SYNC = originalSyncSetting;
    }

    expect(create).toHaveBeenCalledWith(payload, 'submission-with-evidence', evidence);
    await expect(syncService.list()).resolves.toHaveLength(0);
  });
});
