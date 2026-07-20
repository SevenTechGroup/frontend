import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-teal-50 to-amber-50 px-4">
      <section className="max-w-2xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
          Participation citoyenne
        </p>
        <h1 className="text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
          Signalez. Suivez. Améliorez votre quartier.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600">
          Sahel Signal relie les citoyens aux équipes chargées de traiter les problèmes locaux.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            className="rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
            to="/connexion"
          >
            Se connecter
          </Link>
          <Link
            className="rounded-xl border border-teal-700 px-5 py-3 font-semibold text-teal-800"
            to="/inscription"
          >
            Créer un compte
          </Link>
        </div>
      </section>
    </main>
  );
}
