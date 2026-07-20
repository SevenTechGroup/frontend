import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import { BrandLogo } from '../../../components/brand/BrandLogo';
import { toApiError } from '../../../services';

interface AuthPageProps {
  mode: 'login' | 'register';
}

type AuthIconName = 'arrow' | 'check' | 'eye' | 'eyeOff' | 'lock' | 'mail' | 'shield' | 'user';

function AuthIcon({ name, className = 'size-5' }: { name: AuthIconName; className?: string }) {
  const paths = {
    arrow: <path d="M19 12H5m6-6-6 6 6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18M10.6 10.7A2 2 0 0 0 13.3 13.4M9.8 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-2.1 3.1M6.6 6.6C3.6 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4-.8" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  } satisfies Record<AuthIconName, ReactNode>;

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const isRegister = mode === 'register';

  const passwordChecks = useMemo(
    () => [passwordValue.length >= 8, /[A-Za-z]/.test(passwordValue), /\d/.test(passwordValue)],
    [passwordValue],
  );
  const passwordScore = passwordChecks.filter(Boolean).length;

  if (status === 'authenticated') return <Navigate to="/tableau-de-bord" replace />;
  if (status === 'loading') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7faf8]" aria-busy="true">
        <div className="text-center">
          <BrandLogo />
          <span className="mx-auto mt-6 block size-7 animate-spin rounded-full border-2 border-teal-200 border-t-teal-800" />
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Vérification de votre session…
          </p>
        </div>
      </main>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = stringField(form, 'name').trim();
    const email = stringField(form, 'email').trim().toLowerCase();
    const password = stringField(form, 'password');

    if (isRegister) {
      const confirmation = stringField(form, 'password_confirmation');

      if (name.length < 2) {
        setError('Indiquez votre nom complet.');
        return;
      }
      if (!passwordChecks.every(Boolean)) {
        setError('Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.');
        return;
      }
      if (password !== confirmation) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ name, email, password });
      } else {
        await login({ email, password });
      }

      const from = (location.state as { from?: string } | null)?.from;
      void navigate(from ?? '/tableau-de-bord', { replace: true });
    } catch (caught) {
      const apiError = toApiError(caught);
      const firstFieldError = Object.values(apiError.fieldErrors)[0]?.[0];
      setError(firstFieldError ?? apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const highlights = isRegister
    ? [
        'Créez un signalement guidé',
        'Sauvegardez vos brouillons hors ligne',
        'Suivez chaque étape du traitement',
      ]
    : [
        'Retrouvez tous vos signalements',
        'Consultez les mises à jour récentes',
        'Gardez une vue claire sur leur avancement',
      ];

  return (
    <main className="min-h-screen bg-[#f7faf8] text-slate-950 lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="auth-panel relative hidden min-h-screen overflow-hidden bg-[#073c36] p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="landing-grid absolute inset-0 opacity-20" />
        <div className="absolute -left-28 top-1/4 size-80 rounded-full bg-teal-400/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 size-[28rem] rounded-full bg-amber-300/15 blur-3xl" />
        <div className="absolute right-12 top-20 size-24 rounded-full border border-dashed border-amber-300/25" />

        <div className="relative z-10">
          <BrandLogo variant="light" />
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-300">
            <span className="size-2 rounded-full bg-amber-300" />
            {isRegister ? 'Votre voix compte' : 'Bienvenue chez vous'}
          </span>
          <h2 className="mt-7 text-4xl font-black leading-[1.1] tracking-[-0.04em] xl:text-5xl">
            {isRegister
              ? 'Chaque amélioration commence par une voix.'
              : 'Reprenez le fil de vos signalements.'}
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-teal-100/70">
            {isRegister
              ? 'Créez votre espace citoyen et contribuez simplement à rendre votre quartier plus sûr, plus propre et plus agréable.'
              : 'Votre espace vous permet de voir les réponses, les affectations et la progression de chaque dossier.'}
          </p>

          <ul className="mt-9 grid gap-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm font-bold text-teal-50/90">
                <span className="grid size-8 place-items-center rounded-full bg-amber-300 text-slate-950 shadow-lg shadow-black/10">
                  <AuthIcon name="check" className="size-4" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 rounded-2xl border border-white/10 bg-white/[0.065] p-5 backdrop-blur">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-300 text-slate-950">
              <AuthIcon name="shield" />
            </span>
            <div>
              <p className="font-black">Votre espace est protégé</p>
              <p className="mt-1 text-sm leading-6 text-teal-100/60">
                Les accès et les actions sont contrôlés selon votre rôle. Ne partagez jamais votre
                mot de passe.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-24 sm:px-8 lg:px-12 xl:px-20">
        <div className="landing-grid absolute inset-0 opacity-55 lg:opacity-30" />
        <div className="absolute -right-40 -top-40 size-[28rem] rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-teal-200/35 blur-3xl" />

        <div className="absolute left-5 top-6 z-10 sm:left-8 lg:left-12 lg:top-10 xl:left-20">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-slate-600 transition hover:bg-white hover:text-teal-800"
          >
            <AuthIcon
              name="arrow"
              className="size-4 transition-transform group-hover:-translate-x-1"
            />
            Retour à l’accueil
          </Link>
        </div>

        <div className="relative z-10 w-full max-w-[31rem]">
          <div className="mb-9 flex justify-center lg:hidden">
            <BrandLogo />
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_30px_90px_-45px_rgba(15,78,68,0.4)] backdrop-blur-xl sm:p-9 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
              {isRegister ? 'Créer votre espace' : 'Accès sécurisé'}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] sm:text-[2.75rem]">
              {isRegister ? 'Rejoignez Sahel Signal' : 'Heureux de vous revoir'}
            </h1>
            <p className="mt-3 leading-7 text-slate-600">
              {isRegister
                ? 'Quelques informations suffisent pour commencer.'
                : 'Entrez vos identifiants pour accéder à votre espace.'}
            </p>

            <div
              className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1.5"
              aria-label="Choisir un formulaire"
            >
              <Link
                className={`rounded-lg px-3 py-2.5 text-center text-sm font-black transition ${
                  !isRegister
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                to="/connexion"
              >
                Connexion
              </Link>
              <Link
                className={`rounded-lg px-3 py-2.5 text-center text-sm font-black transition ${
                  isRegister
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                to="/inscription"
              >
                Inscription
              </Link>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-red-100 font-black">
                  !
                </span>
                <p className="leading-6">{error}</p>
              </div>
            )}

            <form className="mt-7 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
              {isRegister && (
                <label className="block text-sm font-bold text-slate-700">
                  Nom complet
                  <span className="auth-input mt-2">
                    <AuthIcon name="user" className="auth-input-icon" />
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={255}
                      autoComplete="name"
                      autoFocus
                      placeholder="Votre nom et prénom"
                    />
                  </span>
                </label>
              )}

              <label className="block text-sm font-bold text-slate-700">
                Adresse e-mail
                <span className="auth-input mt-2">
                  <AuthIcon name="mail" className="auth-input-icon" />
                  <input
                    name="email"
                    required
                    type="email"
                    maxLength={255}
                    autoComplete="email"
                    autoFocus={!isRegister}
                    placeholder="nom@exemple.com"
                  />
                </span>
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Mot de passe
                <span className="auth-input mt-2">
                  <AuthIcon name="lock" className="auth-input-icon" />
                  <input
                    name="password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    placeholder={isRegister ? '8 caractères minimum' : 'Votre mot de passe'}
                    onChange={(event) => setPasswordValue(event.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
                    }
                  >
                    <AuthIcon name={showPassword ? 'eyeOff' : 'eye'} className="size-5" />
                  </button>
                </span>
              </label>

              {isRegister && (
                <div className="-mt-2" aria-live="polite">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((level) => (
                      <span
                        key={level}
                        className={`h-1.5 rounded-full transition-colors ${
                          passwordScore >= level
                            ? passwordScore === 3
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    8 caractères minimum, avec une lettre et un chiffre.
                  </p>
                </div>
              )}

              {isRegister && (
                <label className="block text-sm font-bold text-slate-700">
                  Confirmer le mot de passe
                  <span className="auth-input mt-2">
                    <AuthIcon name="lock" className="auth-input-icon" />
                    <input
                      name="password_confirmation"
                      required
                      type={showConfirmation ? 'text' : 'password'}
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Répétez votre mot de passe"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowConfirmation((visible) => !visible)}
                      aria-label={
                        showConfirmation ? 'Masquer la confirmation' : 'Afficher la confirmation'
                      }
                    >
                      <AuthIcon name={showConfirmation ? 'eyeOff' : 'eye'} className="size-5" />
                    </button>
                  </span>
                </label>
              )}

              <button
                className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-teal-800 px-6 py-3.5 font-black text-white shadow-xl shadow-teal-900/15 transition hover:-translate-y-0.5 hover:bg-teal-900 disabled:cursor-wait disabled:opacity-65"
                disabled={submitting}
                type="submit"
              >
                {submitting ? (
                  <>
                    <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Vérification…
                  </>
                ) : (
                  <>
                    {isRegister ? 'Créer mon compte citoyen' : 'Accéder à mon espace'}
                    <span className="grid size-7 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
                      <svg
                        aria-hidden="true"
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M5 12h14m-6-6 6 6-6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-500">
              <AuthIcon name="shield" className="size-4 text-teal-700" />
              Connexion chiffrée · Vos identifiants ne sont jamais affichés
            </p>

            <p className="mt-7 text-center text-sm text-slate-600">
              {isRegister ? 'Vous avez déjà un compte ?' : 'Vous découvrez Sahel Signal ?'}{' '}
              <Link
                className="font-black text-teal-700 underline decoration-teal-300 underline-offset-4 transition hover:text-teal-900"
                to={isRegister ? '/connexion' : '/inscription'}
              >
                {isRegister ? 'Se connecter' : 'Créer un compte'}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
