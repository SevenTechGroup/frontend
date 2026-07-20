import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <h1 className="text-4xl font-bold">Page introuvable</h1>
        <Link className="mt-6 inline-block text-teal-700 underline" to="/">
          Revenir à l’accueil
        </Link>
      </div>
    </main>
  );
}
