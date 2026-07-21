import Echo, { type ConnectionStatus } from 'laravel-echo';
import Pusher from 'pusher-js';
import { z } from 'zod';
import type { Notification } from '../models';
import { authSession } from '../security/auth-session';
import { notificationService } from './notification.service';

const notificationEventSchema = z.object({
  action: z.enum(['created', 'updated']),
  notification: z.object({
    id: z.number().int().positive(),
    user_id: z.number().int().positive(),
    message: z.string().min(1),
    is_read: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

export type RealtimeNotificationEvent = z.infer<typeof notificationEventSchema>;
export type NotificationRealtimeStatus = ConnectionStatus | 'disabled';

export interface NotificationRealtimeSubscription {
  disconnect(): void;
}

interface ConnectCallbacks {
  onEvent: (event: RealtimeNotificationEvent) => void;
  onStatus: (status: NotificationRealtimeStatus) => void;
}

export function mergeRealtimeNotification(
  current: Notification[] | undefined,
  event: RealtimeNotificationEvent,
): Notification[] {
  const withoutCurrentVersion = (current ?? []).filter(
    (notification) => notification.id !== event.notification.id,
  );

  return [event.notification, ...withoutCurrentVersion].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

class NotificationRealtimeService {
  async connect(
    userId: number,
    { onEvent, onStatus }: ConnectCallbacks,
  ): Promise<NotificationRealtimeSubscription | null> {
    const [config, token] = await Promise.all([
      notificationService.realtimeConfig(),
      Promise.resolve(authSession.getToken()),
    ]);

    if (
      !config.enabled ||
      !config.app_key ||
      !config.host ||
      !config.port ||
      !config.scheme ||
      !token
    ) {
      onStatus('disabled');
      return null;
    }

    const echo = new Echo<'reverb'>({
      broadcaster: 'reverb',
      Pusher,
      key: config.app_key,
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: config.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: config.auth_endpoint,
      bearerToken: token,
    });

    const unsubscribeStatus = echo.connector.onConnectionChange(onStatus);
    onStatus(echo.connector.connectionStatus());

    const channel = echo.private(`users.${userId}`);
    channel
      .listen('.notification.changed', (payload: unknown) => {
        const parsed = notificationEventSchema.safeParse(payload);
        if (parsed.success && parsed.data.notification.user_id === userId) {
          onEvent(parsed.data);
        }
      })
      .subscribed(() => onStatus('connected'))
      .error(() => onStatus('failed'));

    return {
      disconnect() {
        unsubscribeStatus();
        echo.leave(`users.${userId}`);
        echo.disconnect();
      },
    };
  }
}

export const notificationRealtimeService = new NotificationRealtimeService();
