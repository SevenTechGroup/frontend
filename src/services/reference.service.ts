import type { ApiDataResponse, Category, Territory, User } from '../models';
import { offlineDataCache } from '../offline/offline-data-cache';
import { httpClient } from './api/http-client';

class ReferenceService {
  async categories(): Promise<Category[]> {
    return offlineDataCache.remember('categories', async () => {
      const { data } = await httpClient.get<ApiDataResponse<Category[]>>('/categories');
      return data.data;
    });
  }

  async territories(): Promise<Territory[]> {
    return offlineDataCache.remember('territories', async () => {
      const { data } = await httpClient.get<ApiDataResponse<Territory[]>>('/territories');
      return data.data;
    });
  }

  async agents(): Promise<User[]> {
    return offlineDataCache.remember('agents', async () => {
      const { data } = await httpClient.get<ApiDataResponse<User[]>>('/agents');
      return data.data;
    });
  }
}

export const referenceService = new ReferenceService();
