import type {
  ApiDataResponse,
  CreateReportEvidence,
  CreateReportInput,
  Report,
  UpdateReportInput,
} from '../models';
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

  async create(
    input: CreateReportInput,
    idempotencyKey?: string,
    evidence?: CreateReportEvidence,
  ): Promise<Report> {
    const config = idempotencyKey
      ? { headers: { 'X-Idempotency-Key': idempotencyKey } }
      : undefined;
    const payload = evidence ? this.toMultipartPayload(input, evidence) : input;
    const { data } = await httpClient.post<ApiDataResponse<Report>>('/reports', payload, config);
    return data.data;
  }

  async update(id: number, input: UpdateReportInput): Promise<Report> {
    const { data } = await httpClient.put<ApiDataResponse<Report>>(`/reports/${id}`, input);
    return data.data;
  }

  private toMultipartPayload(input: CreateReportInput, evidence: CreateReportEvidence): FormData {
    const payload = new FormData();
    payload.append('title', input.title);
    payload.append('description', input.description);
    payload.append('category_id', String(input.category_id));
    payload.append('territory_id', String(input.territory_id));
    payload.append('priority', input.priority ?? 'medium');
    if (input.location_text) payload.append('location_text', input.location_text);

    if (evidence.photo) {
      payload.append('photo', evidence.photo, 'signalement.jpg');
    }
    if (evidence.coordinates && evidence.locationConsentAccepted) {
      payload.append('coordinates[latitude]', String(evidence.coordinates.latitude));
      payload.append('coordinates[longitude]', String(evidence.coordinates.longitude));
      payload.append('coordinates[accuracy]', String(evidence.coordinates.accuracy));
      payload.append('location_consent_accepted', '1');
    }

    return payload;
  }
}

export const reportService = new ReportService();
