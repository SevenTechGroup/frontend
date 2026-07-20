import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/use-auth';
import { can } from '../../security/authorization';

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-teal-700 text-white' : 'text-slate-700 hover:bg-teal-50'
  }`;
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      void navigate('/connexion', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <NavLink to="/tableau-de-bord" className="text-lg font-bold text-teal-800">
            Sahel Signal
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1" aria-label="Navigation principale">
            <NavLink to="/tableau-de-bord" className={navClass}>
              Tableau de bord
            </NavLink>
            <NavLink to="/signalements" className={navClass}>
              Signalements
            </NavLink>
            {can(user, 'report:create') && (
              <NavLink to="/signalements/nouveau" className={navClass}>
                Nouveau
              </NavLink>
            )}
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => void handleLogout()}
            >
              Déconnexion
            </button>
          </nav>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-3 text-xs text-slate-500">
          Connecté en tant que {user?.name} · {user?.role}
        </p>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
