import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('../../../app/providers/use-auth', () => ({
  useAuth: () => ({
    status: 'anonymous',
    user: null,
    login: mocks.login,
    register: mocks.register,
  }),
}));

vi.mock('../../../services', () => ({
  toApiError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Erreur inattendue',
    fieldErrors: {},
  }),
}));

describe('AuthPage', () => {
  it('affiche les accès du jury et préremplit le compte choisi', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AuthPage mode="login" />
      </MemoryRouter>,
    );

    expect(screen.getByText('manager@sahelsignal.local')).toBeInTheDocument();
    expect(screen.getByText('Manager@2026!')).toBeInTheDocument();
    expect(screen.getByText('agent@sahelsignal.local')).toBeInTheDocument();
    expect(screen.getByText('Agent@2026!')).toBeInTheDocument();
    expect(screen.getByText('citoyen@sahelsignal.local')).toBeInTheDocument();
    expect(screen.getByText('Citoyen@2026!')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Utiliser le compte Intervenant' }));

    expect(screen.getByLabelText('Adresse e-mail')).toHaveValue('agent@sahelsignal.local');
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('Agent@2026!');
  });
});
