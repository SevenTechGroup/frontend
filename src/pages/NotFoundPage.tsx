import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';

export function NotFoundPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-4 py-12 text-center text-white">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.22),transparent_32%),radial-gradient(circle_at_80%_75%,rgba(245,158,11,0.15),transparent_27%)]"
        aria-hidden="true"
      />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur sm:p-10">
        <div className="flex justify-center rounded-2xl bg-white px-5 py-3">
          <BrandLogo to="/" />
        </div>
        <p className="mt-8 text-7xl font-black tracking-[-0.08em] text-teal-300">404</p>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-amber-300">
          Itinéraire introuvable
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Cette page n’existe pas</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-slate-300">
          Le lien a peut-être changé ou l’adresse saisie est incomplète. Revenez à l’accueil pour
          poursuivre votre navigation.
        </p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-amber-400 px-5 py-3 font-black text-amber-950 transition hover:bg-amber-300"
          to="/"
        >
          Revenir à l’accueil
        </Link>
      </section>
    </main>
  );
}
