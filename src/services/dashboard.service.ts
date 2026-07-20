import type { ApiDataResponse, DashboardStats } from '../models';
import { httpClient } from './api/http-client';

class DashboardService {
  async get(): Promise<DashboardStats> {
    const { data } = await httpClient.get<ApiDataResponse<DashboardStats>>('/dashboard');
    return data.data;
  }
}

export const dashboardService = new DashboardService();
