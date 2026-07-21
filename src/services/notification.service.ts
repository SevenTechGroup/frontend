import type { ApiDataResponse, Notification } from '../models';
import { offlineDataCache } from '../offline/offline-data-cache';
import { httpClient } from './api/http-client';

export interface RealtimeConfig {
  enabled: boolean;
  app_key: string | null;
  host: string | null;
  port: number | null;
  scheme: 'http' | 'https' | null;
  auth_endpoint: string;
}

class NotificationService {
  async list(): Promise<Notification[]> {
    return offlineDataCache.remember('notifications', async () => {
      const { data } = await httpClient.get<ApiDataResponse<Notification[]>>('/notifications');
      return data.data;
    });
  }

  async markAsRead(id: number): Promise<void> {
    await httpClient.post(`/notifications/${id}/read`);
  }

  async realtimeConfig(): Promise<RealtimeConfig> {
    const { data } = await httpClient.get<ApiDataResponse<RealtimeConfig>>('/realtime/config');
    return data.data;
  }
}

export const notificationService = new NotificationService();
