import { describe, expect, it } from 'vitest';
import type { Notification } from '../models';
import {
  mergeRealtimeNotification,
  type RealtimeNotificationEvent,
} from './notification-realtime.service';

const existing: Notification = {
  id: 1,
  user_id: 7,
  message: 'Première notification',
  is_read: false,
  created_at: '2026-07-21T14:00:00.000Z',
  updated_at: '2026-07-21T14:00:00.000Z',
};

describe('mergeRealtimeNotification', () => {
  it('ajoute immédiatement une nouvelle notification en tête', () => {
    const event: RealtimeNotificationEvent = {
      action: 'created',
      notification: {
        ...existing,
        id: 2,
        message: 'Nouveau signalement affecté',
        created_at: '2026-07-21T15:00:00.000Z',
        updated_at: '2026-07-21T15:00:00.000Z',
      },
    };

    expect(mergeRealtimeNotification([existing], event).map(({ id }) => id)).toEqual([2, 1]);
  });

  it('remplace la notification lue sans créer de doublon', () => {
    const event: RealtimeNotificationEvent = {
      action: 'updated',
      notification: { ...existing, is_read: true },
    };

    expect(mergeRealtimeNotification([existing], event)).toEqual([
      expect.objectContaining({ id: 1, is_read: true }),
    ]);
  });
});
