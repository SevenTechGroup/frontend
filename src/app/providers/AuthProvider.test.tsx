import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../models';
import { authSession } from '../../security/auth-session';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './use-auth';

const mocks = vi.hoisted(() => ({
  me: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../services', () => ({
  authService: mocks,
}));

vi.mock('../../services/api/http-client', () => ({
  AUTH_UNAUTHORIZED_EVENT: 'sahel-signal:unauthorized',
}));

const manager: User = {
  id: 12,
  name: 'Aminata Ndiaye',
  email: 'aminata@example.test',
  role: 'manager',
};

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

function SessionStatus() {
  const { status, user } = useAuth();
  return <p>{`${status} — ${user?.name ?? 'aucun utilisateur'}`}</p>;
}

describe('AuthProvider hors ligne', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authSession.clear();
    setOnline(true);
  });

  it('conserve la session locale sans appeler le serveur lorsque le réseau est coupé', async () => {
    authSession.set('offline-token', manager);
    setOnline(false);

    render(
      <AuthProvider>
        <SessionStatus />
      </AuthProvider>,
    );

    expect(await screen.findByText('authenticated — Aminata Ndiaye')).toBeInTheDocument();
    expect(mocks.me).not.toHaveBeenCalled();
  });
});
