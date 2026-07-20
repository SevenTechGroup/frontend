export interface ApiDataResponse<T> {
  data: T;
  message?: string;
}

export interface ApiMessageResponse {
  message: string;
}

export interface ValidationErrorResponse {
  message: string;
  errors: Record<string, string[]>;
}

export interface ApiErrorShape {
  status: number | null;
  message: string;
  fieldErrors: Record<string, string[]>;
  requestId?: string;
}
