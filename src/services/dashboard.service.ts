import type { ApiDataResponse, DashboardStats } from '../models';
import { offlineDataCache } from '../offline/offline-data-cache';
import { httpClient } from './api/http-client';

class DashboardService {
  async get(): Promise<DashboardStats> {
    return offlineDataCache.remember('dashboard', async () => {
      const { data } = await httpClient.get<ApiDataResponse<DashboardStats>>('/dashboard');
      return data.data;
    });
  }
}

export const dashboardService = new DashboardService();
