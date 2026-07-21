import type { ApiDataResponse, Category, Territory, User } from '../models';
import { httpClient } from './api/http-client';

class ReferenceService {
  async categories(): Promise<Category[]> {
    const { data } = await httpClient.get<ApiDataResponse<Category[]>>('/categories');
    return data.data;
  }

  async territories(): Promise<Territory[]> {
    const { data } = await httpClient.get<ApiDataResponse<Territory[]>>('/territories');
    return data.data;
  }

  async agents(): Promise<User[]> {
    const { data } = await httpClient.get<ApiDataResponse<User[]>>('/agents');
    return data.data;
  }
}

export const referenceService = new ReferenceService();
