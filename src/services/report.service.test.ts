import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reportService } from './report.service';

const { postMock } = vi.hoisted(() => ({
  postMock:
    vi.fn<
      (url: string, payload: unknown, config?: unknown) => Promise<{ data: { data: unknown } }>
    >(),
}));

vi.mock('./api/http-client', () => ({
  httpClient: {
    post: postMock,
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const report = {
  id: 10,
  user_id: 1,
  category_id: 2,
  territory_id: 3,
  title: 'Route inondée',
  description: 'La route est totalement impraticable depuis ce matin.',
  location_text: 'Près du marché',
  priority: 'high' as const,
  status: 'received' as const,
  created_at: '2026-07-20T12:00:00.000Z',
  updated_at: '2026-07-20T12:00:00.000Z',
};

describe('ReportService evidence upload', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ data: { data: report } });
  });

  it('envoie la photo et la position consentie en multipart', async () => {
    const photo = new Blob(['compressed-photo'], { type: 'image/jpeg' });

    await reportService.create(
      {
        title: report.title,
        description: report.description,
        category_id: 2,
        territory_id: 3,
        location_text: report.location_text,
        priority: 'high',
      },
      'submission-123',
      {
        photo,
        coordinates: { latitude: 14.7167, longitude: -17.4677, accuracy: 18.4 },
        locationConsentAccepted: true,
      },
    );

    const [, payload, config] = postMock.mock.calls[0] ?? [];
    expect(payload).toBeInstanceOf(FormData);
    const formData = payload as FormData;
    expect(formData.get('photo')).toBeInstanceOf(File);
    expect(formData.get('coordinates[latitude]')).toBe('14.7167');
    expect(formData.get('coordinates[longitude]')).toBe('-17.4677');
    expect(formData.get('coordinates[accuracy]')).toBe('18.4');
    expect(formData.get('location_consent_accepted')).toBe('1');
    expect(config).toEqual({ headers: { 'X-Idempotency-Key': 'submission-123' } });
  });

  it('conserve le JSON pour un signalement sans preuve', async () => {
    const input = {
      title: report.title,
      description: report.description,
      category_id: 2,
      territory_id: 3,
      priority: 'medium' as const,
    };

    await reportService.create(input);

    expect(postMock).toHaveBeenCalledWith('/reports', input, undefined);
  });
});
