import type { ApiDataResponse, CreateReportInput, Report, UpdateReportInput } from '../models';
import { httpClient } from './api/http-client';

class ReportService {
  async list(): Promise<Report[]> {
    const { data } = await httpClient.get<ApiDataResponse<Report[]>>('/reports');
    return data.data;
  }

  async get(id: number): Promise<Report> {
    const { data } = await httpClient.get<ApiDataResponse<Report>>(`/reports/${id}`);
    return data.data;
  }

  async create(input: CreateReportInput, idempotencyKey?: string): Promise<Report> {
    const config = idempotencyKey
      ? { headers: { 'X-Idempotency-Key': idempotencyKey } }
      : undefined;
    const { data } = await httpClient.post<ApiDataResponse<Report>>('/reports', input, config);
    return data.data;
  }

  async update(id: number, input: UpdateReportInput): Promise<Report> {
    const { data } = await httpClient.put<ApiDataResponse<Report>>(`/reports/${id}`, input);
    return data.data;
  }
}

export const reportService = new ReportService();
