import type {
  ApiDataResponse,
  Assignment,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from '../models';
import { httpClient } from './api/http-client';

class AssignmentService {
  async list(): Promise<Assignment[]> {
    const { data } = await httpClient.get<ApiDataResponse<Assignment[]>>('/assignments');
    return data.data;
  }

  async create(input: CreateAssignmentInput): Promise<Assignment> {
    const { data } = await httpClient.post<ApiDataResponse<Assignment>>('/assignments', input);
    return data.data;
  }

  async update(id: number, input: UpdateAssignmentInput): Promise<Assignment> {
    const { data } = await httpClient.put<ApiDataResponse<Assignment>>(`/assignments/${id}`, input);
    return data.data;
  }
}

export const assignmentService = new AssignmentService();
