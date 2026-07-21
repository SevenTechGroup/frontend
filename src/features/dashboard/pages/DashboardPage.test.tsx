import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardStats, User } from '../../../models';
import { DashboardPage } from './DashboardPage';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  getDashboard: vi.fn(),
}));

vi.mock('../../../app/providers/use-auth', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../../offline', () => ({
  useNetworkStatus: () => true,
}));

vi.mock('../../../services', () => ({
  queryKeys: { dashboard: ['dashboard'] },
  dashboardService: { get: mocks.getDashboard },
  toApiError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Erreur inattendue',
  }),
}));

const stats: DashboardStats = {
  total_reports: 9,
  total_assignments: 4,
  unread_notifications: 2,
  my_reports: 3,
  my_assignments: 4,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(<DashboardPage />, { wrapper: Wrapper });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDashboard.mockResolvedValue(stats);
  });

  it('affiche uniquement les indicateurs utiles au citoyen', async () => {
    mocks.user = { id: 1, name: 'Awa Diop', email: 'awa@example.test', role: 'citizen' };
    renderPage();

    expect((await screen.findAllByText('Mes signalements')).length).toBeGreaterThan(0);
    expect(screen.getByText('Notifications non lues')).toBeInTheDocument();
    expect(screen.queryByText('Interventions suivies')).not.toBeInTheDocument();
    expect(screen.queryByText('Mes interventions')).not.toBeInTheDocument();
  });

  it('présente les missions personnelles à l’intervenant', async () => {
    mocks.user = { id: 2, name: 'Moussa Diop', email: 'moussa@example.test', role: 'agent' };
    renderPage();

    expect(await screen.findByText('Signalements accessibles')).toBeInTheDocument();
    expect((await screen.findAllByText('Mes interventions')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Interventions suivies')).not.toBeInTheDocument();
  });

  it('présente la vue globale au responsable', async () => {
    mocks.user = { id: 3, name: 'Aminata Ndiaye', email: 'manager@example.test', role: 'manager' };
    renderPage();

    expect(await screen.findByText('Signalements accessibles')).toBeInTheDocument();
    expect(screen.getByText('Interventions suivies')).toBeInTheDocument();
    expect(screen.queryByText('Mes interventions')).not.toBeInTheDocument();
    expect(screen.queryByText('Mes signalements')).not.toBeInTheDocument();
  });
});
