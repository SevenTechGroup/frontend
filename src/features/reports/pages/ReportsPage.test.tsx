import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Report, User } from '../../../models';
import { ReportsPage } from './ReportsPage';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  list: vi.fn(),
  update: vi.fn(),
  getAttachmentContent: vi.fn(),
}));

vi.mock('../../../app/providers/use-auth', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../../services', () => ({
  queryKeys: {
    reports: ['reports'],
    dashboard: ['dashboard'],
    attachmentContent: (id: number) => ['attachments', id, 'content'],
  },
  reportService: {
    list: mocks.list,
    update: mocks.update,
    getAttachmentContent: mocks.getAttachmentContent,
  },
  toApiError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Erreur inattendue',
  }),
}));

const reports: Report[] = [
  {
    id: 41,
    user_id: 1,
    category_id: 3,
    territory_id: 10,
    title: 'Route inondée',
    description: 'La route principale est impraticable depuis ce matin.',
    location_text: 'Près du marché',
    priority: 'high',
    status: 'received',
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
  },
  {
    id: 42,
    user_id: 2,
    category_id: 4,
    territory_id: 11,
    title: 'Canal bouché',
    description: 'Le canal déborde devant plusieurs habitations.',
    location_text: 'Rue des écoles',
    priority: 'medium',
    status: 'resolved',
    category: {
      id: 4,
      name: 'Assainissement',
      slug: 'assainissement',
      severity: 'medium',
      description: null,
      is_active: true,
    },
    territory: { id: 11, name: 'Guédiawaye', code: 'GUE', is_active: true },
    created_at: '2026-07-19T08:30:00.000Z',
    updated_at: '2026-07-20T09:00:00.000Z',
  },
];

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
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(<ReportsPage />, { wrapper: Wrapper }) };
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 1, name: 'Awa', email: 'awa@example.test', role: 'citizen' };
    mocks.list.mockResolvedValue(reports);
    mocks.getAttachmentContent.mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' }));
    mocks.update.mockImplementation((id: number, input: { status: string }) =>
      Promise.resolve({
        ...reports.find((report) => report.id === id),
        ...input,
      }),
    );
  });

  it('filtre les dossiers sans afficher les actions interdites au citoyen', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Mes signalements' })).toBeInTheDocument();
    expect(screen.getByText('Route inondée')).toBeInTheDocument();
    expect(screen.getByText('Canal bouché')).toBeInTheDocument();
    expect(screen.queryByText('Dossier #41')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('img', {
        name: 'Preuve photographique du signalement « Route inondée »',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Photo transmise par le citoyen avec ce signalement.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prendre en charge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marquer comme résolu' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: 'Recherche' }), 'canal');
    expect(screen.queryByText('Route inondée')).not.toBeInTheDocument();
    expect(screen.getByText('Canal bouché')).toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Recherche' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priorité' }), 'high');
    expect(screen.getByText('Route inondée')).toBeInTheDocument();
    expect(screen.queryByText('Canal bouché')).not.toBeInTheDocument();
  });

  it('permet à un agent de faire avancer un dossier puis invalide les caches', async () => {
    mocks.user = { id: 2, name: 'Moussa', email: 'moussa@example.test', role: 'agent' };
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    expect(
      await screen.findByRole('heading', { name: 'Signalements à traiter' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prendre en charge' }));

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledWith(41, { status: 'in_progress' });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['reports'] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  it('affiche une erreur actionnable et permet de relancer le chargement', async () => {
    mocks.list
      .mockRejectedValueOnce(new Error('Réseau indisponible'))
      .mockResolvedValueOnce(reports);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Réseau indisponible');
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByRole('heading', { name: 'Mes signalements' })).toBeInTheDocument();
  });
});
