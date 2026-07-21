import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Report, UpdateReportInput, User } from '../../../models';
import { ReportDetailPage } from './ReportDetailPage';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  get: vi.fn(),
  update: vi.fn(),
  getAttachmentContent: vi.fn(),
}));

vi.mock('../../../app/providers/use-auth', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../../services', () => ({
  queryKeys: {
    report: (id: number) => ['reports', id],
    reports: ['reports'],
    dashboard: ['dashboard'],
    attachmentContent: (id: number) => ['attachments', id, 'content'],
  },
  reportService: {
    get: mocks.get,
    update: mocks.update,
    getAttachmentContent: mocks.getAttachmentContent,
  },
  toApiError: (error: unknown) => {
    if (typeof error === 'object' && error !== null && 'status' in error) return error;
    return {
      status: null,
      message: error instanceof Error ? error.message : 'Erreur inattendue',
      fieldErrors: {},
    };
  },
}));

const report: Report = {
  id: 41,
  user_id: 1,
  category_id: 3,
  territory_id: 10,
  title: 'Route inondée',
  description: 'La route principale est impraticable depuis plusieurs heures.',
  location_text: 'Près du marché central',
  priority: 'medium',
  status: 'received',
  user: { id: 1, name: 'Awa Diop', email: 'awa@example.test', role: 'citizen' },
  category: {
    id: 3,
    name: 'Inondation',
    slug: 'inondation',
    severity: 'high',
    description: null,
    is_active: true,
  },
  territory: { id: 10, name: 'Dakar Plateau', code: 'DKR', is_active: true },
  attachments: [
    {
      id: 17,
      report_id: 41,
      provider: 'cloudinary',
      resource_type: 'image',
      delivery_type: 'authenticated',
      format: 'jpg',
      mime_type: 'image/jpeg',
      original_filename: 'route-inondee.jpg',
      bytes: 450000,
      width: 900,
      height: 600,
      created_at: '2026-07-20T10:00:00.000Z',
      updated_at: '2026-07-20T10:00:00.000Z',
    },
  ],
  created_at: '2026-07-20T10:00:00.000Z',
  updated_at: '2026-07-20T10:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/signalements/41']}>
          <Routes>
            <Route path="/signalements/:reportId" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(<ReportDetailPage />, { wrapper: Wrapper }) };
}

describe('ReportDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 1, name: 'Awa Diop', email: 'awa@example.test', role: 'citizen' };
    mocks.get.mockResolvedValue(report);
    mocks.getAttachmentContent.mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' }));
    mocks.update.mockImplementation((id: number, input: UpdateReportInput) =>
      Promise.resolve({ ...report, id, ...input }),
    );
  });

  it('présente au citoyen une fiche complète en lecture seule', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Route inondée' })).toBeInTheDocument();
    expect(screen.getByText('Fiche de signalement')).toBeInTheDocument();
    expect(screen.queryByText('Dossier #41')).not.toBeInTheDocument();
    expect(screen.getByText('Awa Diop')).toBeInTheDocument();
    expect(screen.getByText('Inondation')).toBeInTheDocument();
    expect(screen.getByText('Dakar Plateau')).toBeInTheDocument();
    expect(screen.getByText(report.description)).toBeInTheDocument();
    expect(screen.getByText('Photo transmise avec le signalement')).toBeInTheDocument();
    expect(
      await screen.findByRole('img', {
        name: 'Preuve photographique 1 du signalement « Route inondée »',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Consultation en lecture seule pour votre rôle.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Priorité du signalement')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Passer en traitement' })).not.toBeInTheDocument();
  });

  it('attend la réponse serveur avant d’afficher une transition', async () => {
    mocks.user = { id: 2, name: 'Moussa', email: 'moussa@example.test', role: 'agent' };
    let resolveUpdate: ((value: Report) => void) | undefined;
    mocks.update.mockReturnValueOnce(
      new Promise<Report>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    await screen.findByRole('heading', { name: 'Route inondée' });
    await user.click(screen.getByRole('button', { name: 'Passer en traitement' }));

    expect(mocks.update).toHaveBeenCalledWith(41, { status: 'in_progress' });
    expect(screen.getByText('Reçu')).toBeInTheDocument();
    expect(screen.queryByText('En cours')).not.toBeInTheDocument();

    await act(async () => {
      resolveUpdate?.({ ...report, status: 'in_progress' });
      await Promise.resolve();
    });

    expect(await screen.findByText('En cours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer comme résolu' })).toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reports', 41] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reports'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
  });

  it('affiche clairement les refus 422 puis 403', async () => {
    mocks.user = { id: 3, name: 'Fatou', email: 'fatou@example.test', role: 'manager' };
    mocks.update
      .mockRejectedValueOnce({
        status: 422,
        message: 'The status transition is not allowed.',
        fieldErrors: { status: ['Cette transition de statut est interdite.'] },
      })
      .mockRejectedValueOnce({ status: 403, message: 'Forbidden', fieldErrors: {} });
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Route inondée' });
    await user.click(screen.getByRole('button', { name: 'Passer en traitement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette transition de statut est interdite.',
    );

    await user.click(screen.getByRole('button', { name: 'Passer en traitement' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Action refusée : votre rôle ne permet pas de modifier ce signalement.',
      );
    });
  });
});
