import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';

export function NotAuthorizedPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f4f8f7] px-4 py-12 text-center">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.15),transparent_30%),radial-gradient(circle_at_85%_80%,rgba(245,158,11,0.13),transparent_28%)]"
        aria-hidden="true"
      />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-white bg-white/90 p-7 shadow-[0_32px_90px_-42px_rgba(15,23,42,0.45)] backdrop-blur sm:p-10">
        <div className="flex justify-center">
          <BrandLogo to="/" />
        </div>
        <span className="mx-auto mt-8 grid size-20 place-items-center rounded-[1.4rem] bg-amber-50 text-3xl font-black text-amber-700 ring-1 ring-amber-200">
          !
        </span>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-teal-700">
          Espace sécurisé
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Accès non autorisé
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600">
          Cette fonctionnalité appartient à un autre espace métier. Votre tableau de bord contient
          toutes les actions disponibles pour votre rôle.
        </p>
        <Link className="button-primary mt-7 inline-flex" to="/tableau-de-bord">
          Retour à mon espace
        </Link>
      </section>
    </main>
  );
}
