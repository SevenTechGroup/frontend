import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { LoginInput, RegisterInput, User } from '../../models';
import { authSession } from '../../security/auth-session';
import { authService } from '../../services';
import { AUTH_UNAUTHORIZED_EVENT } from '../../services/api/http-client';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export function AuthProvider({ children }: PropsWithChildren) {
  const hasToken = authSession.getToken() !== null;
  const [user, setUser] = useState<User | null>(() => authSession.getUser());
  const [status, setStatus] = useState<AuthStatus>(hasToken ? 'loading' : 'anonymous');

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setStatus('anonymous');
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);

    if (hasToken) {
      void authService
        .me()
        .then((currentUser) => {
          setUser(currentUser);
          setStatus('authenticated');
        })
        .catch(() => {
          authSession.clear();
          setUser(null);
          setStatus('anonymous');
        });
    }

    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [hasToken]);

  const login = useCallback(async (input: LoginInput) => {
    const currentUser = await authService.login(input);
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const currentUser = await authService.register(input);
    setUser(currentUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
