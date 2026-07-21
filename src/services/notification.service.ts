import type { ApiDataResponse, Notification } from '../models';
import { offlineDataCache } from '../offline/offline-data-cache';
import { httpClient } from './api/http-client';

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
}

export const notificationService = new NotificationService();
