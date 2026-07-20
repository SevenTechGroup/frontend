import axios, { AxiosHeaders } from 'axios';
import type { ApiErrorShape, ValidationErrorResponse } from '../../models';

export class ApiError extends Error implements ApiErrorShape {
  readonly status: number | null;
  readonly fieldErrors: Record<string, string[]>;
  readonly requestId?: string;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = 'ApiError';
    this.status = error.status;
    this.fieldErrors = error.fieldErrors;
    if (error.requestId !== undefined) this.requestId = error.requestId;
  }
}

function getHeader(headers: unknown, name: string): string | undefined {
  if (headers instanceof AxiosHeaders) {
    const value = headers.get(name);
    return typeof value === 'string' ? value : undefined;
  }

  if (typeof headers !== 'object' || headers === null) return undefined;
  const value = (headers as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (!axios.isAxiosError<Partial<ValidationErrorResponse>>(error)) {
    return new ApiError({
      status: null,
      message: error instanceof Error ? error.message : 'Une erreur inattendue est survenue.',
      fieldErrors: {},
    });
  }

  const requestId = getHeader(error.response?.headers, 'x-request-id');
  const serverMessage = error.response?.data?.message;

  return new ApiError({
    status: error.response?.status ?? null,
    message:
      typeof serverMessage === 'string'
        ? serverMessage
        : error.response
          ? 'La requête a échoué.'
          : 'Le serveur est injoignable. Vérifiez votre connexion.',
    fieldErrors: error.response?.data?.errors ?? {},
    ...(requestId === undefined ? {} : { requestId }),
  });
}
