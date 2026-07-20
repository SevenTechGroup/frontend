import axios from 'axios';
import { toApiError } from './api-error';

describe('toApiError', () => {
  it('normalise les erreurs de validation Laravel', () => {
    const error = new axios.AxiosError('Unprocessable', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { message: 'The given data was invalid.', errors: { title: ['Required'] } },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: { 'x-request-id': 'request-123' },
      config: { headers: new axios.AxiosHeaders() },
    });

    expect(toApiError(error)).toMatchObject({
      status: 422,
      message: 'The given data was invalid.',
      fieldErrors: { title: ['Required'] },
      requestId: 'request-123',
    });
  });

  it('produit un message actionnable sans réponse réseau', () => {
    const error = new axios.AxiosError('Network Error');
    expect(toApiError(error).message).toContain('connexion');
  });
});
