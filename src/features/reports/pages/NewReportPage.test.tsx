import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { draftRepository } from '../../../offline';
import { NewReportPage } from './NewReportPage';

vi.mock('../../../services', () => ({
  queryKeys: {
    categories: ['categories'],
    territories: ['territories'],
    reports: ['reports'],
  },
  referenceService: {
    categories: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: 'Inondation',
        slug: 'inondation',
        severity: 3,
        description: null,
        is_active: true,
      },
    ]),
    territories: vi
      .fn()
      .mockResolvedValue([{ id: 2, name: 'Dakar Plateau', code: 'DKR', is_active: true }]),
  },
  reportService: { create: vi.fn() },
  toApiError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Erreur inattendue',
    fieldErrors: {},
  }),
}));

vi.mock('../../../offline', () => ({
  useNetworkStatus: () => true,
  draftRepository: {
    get: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  },
  syncService: { enqueueReport: vi.fn(), removeBySubmission: vi.fn() },
}));

function renderPage(initialEntry = '/signalements/nouveau') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  });
  queryClient.setQueryData(
    ['categories'],
    [
      {
        id: 1,
        name: 'Inondation',
        slug: 'inondation',
        severity: 3,
        description: null,
        is_active: true,
      },
    ],
  );
  queryClient.setQueryData(
    ['territories'],
    [{ id: 2, name: 'Dakar Plateau', code: 'DKR', is_active: true }],
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <NewReportPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('NewReportPage', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  it('guides the citizen step by step without losing input', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Quelle situation signalez-vous ?' }),
    ).toBeInTheDocument();
    await screen.findByRole('option', { name: 'Inondation' });

    const continueButton = screen.getByRole('button', { name: 'Continuer' });
    continueButton.focus();
    await user.keyboard('{Enter}');
    expect(
      await screen.findByText('Choisissez la catégorie qui correspond le mieux à la situation.'),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Catégorie du signalement'), '1');
    await user.click(continueButton);

    expect(screen.getByRole('heading', { name: 'Décrivez ce qui se passe' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Titre du signalement'), 'Route inondée');
    await user.type(
      screen.getByLabelText('Description détaillée'),
      'La route est impraticable depuis les fortes pluies de ce matin.',
    );
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    await user.selectOptions(screen.getByLabelText('Territoire concerné'), '2');
    await user.type(screen.getByLabelText(/Quartier ou point de repère/), 'Près du marché central');
    await user.click(screen.getByRole('button', { name: 'Continuer' }));

    expect(screen.getByRole('heading', { name: 'Vérifiez votre signalement' })).toBeInTheDocument();
    expect(screen.getByText('Route inondée')).toBeInTheDocument();
    expect(screen.getByText('Dakar Plateau · Près du marché central')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Modifier la description' }));
    expect(screen.getByLabelText('Titre du signalement')).toHaveValue('Route inondée');
    expect(screen.getByLabelText('Description détaillée')).toHaveValue(
      'La route est impraticable depuis les fortes pluies de ce matin.',
    );
  }, 15_000);

  it('restores a selected local draft', async () => {
    vi.spyOn(draftRepository, 'get').mockResolvedValue({
      clientSubmissionId: 'draft-42',
      title: 'Canal bouché',
      description: 'Le canal déborde devant plusieurs maisons du quartier.',
      categoryId: 1,
      territoryId: 2,
      locationText: 'Rue du marché',
      priority: 'high',
      consentAccepted: true,
      updatedAt: '2026-07-20T12:00:00.000Z',
    });

    renderPage('/signalements/nouveau?brouillon=draft-42');

    expect(
      await screen.findByText('Brouillon repris. Vos informations ont été restaurées.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continuer' }));
    expect(screen.getByLabelText('Titre du signalement')).toHaveValue('Canal bouché');
  });
});
