import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Assignment, Report, User } from '../../../models';
import { AssignmentsPage } from './AssignmentsPage';

const mocks = vi.hoisted(() => ({
  user: null as User | null,
  listAssignments: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  listReports: vi.fn(),
  listAgents: vi.fn(),
}));

vi.mock('../../../app/providers/use-auth', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../../services', () => ({
  queryKeys: {
    assignments: ['assignments'],
    dashboard: ['dashboard'],
    notifications: ['notifications'],
    reports: ['reports'],
    agents: ['references', 'agents'],
  },
  assignmentService: {
    list: mocks.listAssignments,
    create: mocks.createAssignment,
    update: mocks.updateAssignment,
  },
  reportService: { list: mocks.listReports },
  referenceService: { agents: mocks.listAgents },
  toApiError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Erreur inattendue',
  }),
}));

const report: Report = {
  id: 41,
  user_id: 1,
  category_id: 3,
  territory_id: 10,
  title: 'Route inondée',
  description: 'La route principale est impraticable.',
  location_text: 'Marché central',
  priority: 'high',
  status: 'received',
  category: {
    id: 3,
    name: 'Eau et assainissement',
    slug: 'eau-assainissement',
    severity: 'high',
    description: null,
    is_active: true,
  },
  territory: { id: 10, name: 'Dakar', code: 'DKR', is_active: true },
  created_at: '2026-07-20T10:00:00.000Z',
  updated_at: '2026-07-20T10:00:00.000Z',
};
const agent: User = {
  id: 8,
  name: 'Moussa Diop',
  email: 'moussa@example.test',
  role: 'agent',
};
const assignment: Assignment = {
  id: 5,
  report_id: report.id,
  user_id: agent.id,
  notes: 'Vérifier la zone.',
  status: 'assigned',
  report,
  user: agent,
  created_at: '2026-07-20T11:00:00.000Z',
  updated_at: '2026-07-20T11:00:00.000Z',
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(<AssignmentsPage />, { wrapper: Wrapper }) };
}

describe('AssignmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOnline(true);
    mocks.user = agent;
    mocks.listAssignments.mockResolvedValue([assignment]);
    mocks.listReports.mockResolvedValue([report]);
    mocks.listAgents.mockResolvedValue([agent]);
    mocks.createAssignment.mockResolvedValue(assignment);
    mocks.updateAssignment.mockResolvedValue({ ...assignment, status: 'in_progress' });
  });

  it('permet à l’agent de faire avancer uniquement ses affectations', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    expect(await screen.findByRole('heading', { name: 'Mes affectations' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Créer une affectation' }),
    ).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Commencer' }));

    await waitFor(() => {
      expect(mocks.updateAssignment).toHaveBeenCalledWith(5, { status: 'in_progress' });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['assignments'] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  it('réserve la création d’affectation au manager', async () => {
    mocks.user = { id: 2, name: 'Aminata', email: 'aminata@example.test', role: 'manager' };
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Créer une affectation' }),
    ).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Route inondée — Dakar' });
    await screen.findByRole('option', { name: 'Moussa Diop — Intervenant terrain' });
    await user.selectOptions(screen.getByLabelText('Signalement'), '41');
    await user.selectOptions(screen.getByLabelText('Intervenant responsable'), '8');
    await user.type(screen.getByLabelText('Instructions facultatives'), 'Intervenir rapidement.');
    await user.click(screen.getByRole('button', { name: 'Affecter l’intervention' }));

    expect(screen.queryByText('#41', { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText('moussa@example.test', { exact: false })).not.toBeInTheDocument();
    expect(screen.getByText('Eau et assainissement')).toBeInTheDocument();
    expect(screen.getByText('Dakar')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.createAssignment).toHaveBeenCalledWith({
        report_id: 41,
        user_id: 8,
        notes: 'Intervenir rapidement.',
      });
    });
  });

  it('garde les affectations consultables et bloque clairement les modifications hors ligne', async () => {
    mocks.user = { id: 2, name: 'Aminata', email: 'aminata@example.test', role: 'manager' };
    setOnline(false);

    renderPage();

    expect((await screen.findAllByText('Route inondée')).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Les affectations enregistrées restent consultables hors ligne. Reconnectez-vous pour créer une affectation ou modifier son état.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Signalement')).toBeDisabled();
    expect(screen.getByLabelText('Intervenant responsable')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Affecter l’intervention' })).toBeDisabled();
  });
});
