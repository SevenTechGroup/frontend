import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsPage } from './NotificationsPage';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  markAsRead: vi.fn(),
}));

vi.mock('../../../services', () => ({
  queryKeys: {
    notifications: ['notifications'],
    dashboard: ['dashboard'],
  },
  notificationService: {
    list: mocks.list,
    markAsRead: mocks.markAsRead,
  },
  toApiError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Erreur inattendue',
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, ...render(<NotificationsPage />, { wrapper: Wrapper }) };
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue([
      {
        id: 12,
        user_id: 8,
        message: 'Une nouvelle intervention vous a été affectée.',
        is_read: false,
        created_at: '2026-07-20T11:00:00.000Z',
        updated_at: '2026-07-20T11:00:00.000Z',
      },
      {
        id: 11,
        user_id: 8,
        message: 'Le dossier précédent est terminé.',
        is_read: true,
        created_at: '2026-07-19T11:00:00.000Z',
        updated_at: '2026-07-19T11:00:00.000Z',
      },
    ]);
    mocks.markAsRead.mockResolvedValue(undefined);
  });

  it('marque une notification comme lue puis rafraîchit les compteurs', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

    expect(
      await screen.findByText('Une nouvelle intervention vous a été affectée.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Le signalement précédent est terminé.')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Marquer comme lue' }));

    await waitFor(() => {
      expect(mocks.markAsRead).toHaveBeenCalledWith(12);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });
});
