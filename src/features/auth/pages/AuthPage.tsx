import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import { toApiError } from '../../../services';

interface AuthPageProps {
  mode: 'login' | 'register';
}

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function AuthPage({ mode }: AuthPageProps) {
  const { status, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === 'register';

  if (status === 'authenticated') return <Navigate to="/tableau-de-bord" replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = stringField(form, 'email').trim().toLowerCase();
    const password = stringField(form, 'password');

    try {
      if (isRegister) {
        await register({ name: stringField(form, 'name').trim(), email, password });
      } else {
        await login({ email, password });
      }

      const from = (location.state as { from?: string } | null)?.from;
      void navigate(from ?? '/tableau-de-bord', { replace: true });
    } catch (caught) {
      setError(toApiError(caught).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link to="/" className="text-sm font-semibold text-teal-700">
          ← Accueil
        </Link>
        <h1 className="mt-5 text-3xl font-bold">{isRegister ? 'Créer un compte' : 'Connexion'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {isRegister
            ? 'Le compte créé publiquement reçoit toujours le rôle citoyen.'
            : 'Accédez à votre espace sécurisé.'}
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <form className="mt-6 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {isRegister && (
            <label className="block text-sm font-medium">
              Nom complet
              <input name="name" required maxLength={255} autoComplete="name" className="field" />
            </label>
          )}
          <label className="block text-sm font-medium">
            Adresse e-mail
            <input
              name="email"
              required
              type="email"
              maxLength={255}
              autoComplete="email"
              className="field"
            />
          </label>
          <label className="block text-sm font-medium">
            Mot de passe
            <input
              name="password"
              required
              type="password"
              minLength={8}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="field"
            />
          </label>
          <button className="button-primary w-full" disabled={submitting} type="submit">
            {submitting ? 'Veuillez patienter…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          {isRegister ? 'Déjà inscrit ?' : 'Pas encore de compte ?'}{' '}
          <Link
            className="font-semibold text-teal-700 underline"
            to={isRegister ? '/connexion' : '/inscription'}
          >
            {isRegister ? 'Se connecter' : 'S’inscrire'}
          </Link>
        </p>
      </section>
    </main>
  );
}
