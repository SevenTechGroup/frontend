import { Link } from 'react-router-dom';

export function NotAuthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="text-3xl font-bold">Accès non autorisé</h1>
        <p className="mt-3 text-slate-600">Votre rôle ne permet pas d’ouvrir cette page.</p>
        <Link className="mt-6 inline-block text-teal-700 underline" to="/tableau-de-bord">
          Retour au tableau de bord
        </Link>
      </div>
    </main>
  );
}
