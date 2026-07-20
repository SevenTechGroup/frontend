import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import {
  getRoleInterface,
  type DashboardMetricKey,
  type WorkspaceIcon,
} from '../../../config/role-interface';
import { useNetworkStatus } from '../../../offline';
import { dashboardService, queryKeys, toApiError } from '../../../services';

const metricConfig: Record<
  DashboardMetricKey,
  {
    label: string;
    description: string;
    icon: 'reports' | 'assignments' | 'notifications' | 'mine' | 'tasks';
    tone: string;
    iconTone: string;
  }
> = {
  total_reports: {
    label: 'Signalements actifs',
    description: 'Dossiers visibles dans votre périmètre',
    icon: 'reports',
    tone: 'border-teal-100 hover:border-teal-300',
    iconTone: 'bg-teal-50 text-teal-700',
  },
  total_assignments: {
    label: 'Affectations suivies',
    description: 'Interventions prises en charge par les équipes',
    icon: 'assignments',
    tone: 'border-sky-100 hover:border-sky-300',
    iconTone: 'bg-sky-50 text-sky-700',
  },
  unread_notifications: {
    label: 'Points d’attention',
    description: 'Notifications qui restent à consulter',
    icon: 'notifications',
    tone: 'border-amber-100 hover:border-amber-300',
    iconTone: 'bg-amber-50 text-amber-700',
  },
  my_reports: {
    label: 'Mes signalements',
    description: 'Alertes transmises depuis votre compte',
    icon: 'mine',
    tone: 'border-violet-100 hover:border-violet-300',
    iconTone: 'bg-violet-50 text-violet-700',
  },
  my_assignments: {
    label: 'Mes interventions',
    description: 'Missions qui vous sont personnellement confiées',
    icon: 'tasks',
    tone: 'border-rose-100 hover:border-rose-300',
    iconTone: 'bg-rose-50 text-rose-700',
  },
};

type DashboardIconName = WorkspaceIcon | 'mine' | 'tasks' | 'arrow';

function DashboardIcon({
  name,
  className = 'size-5',
}: {
  name: DashboardIconName;
  className?: string;
}) {
  const paths: Record<DashboardIconName, string> = {
    dashboard: 'M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z',
    reports: 'M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h7',
    new: 'M12 5v14M5 12h14',
    drafts: 'M5 4h14v16H5V4Zm4 4h6m-6 4h6m-6 4h4',
    assignments: 'M8 6h11v14H5V6h3Zm0 0V4h6v2M9 11h6m-6 4h4',
    notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4',
    mine: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 0 0-14 0',
    tasks: 'm8 12 2.5 2.5L16 9m-8 9h10M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2Z',
    arrow: 'm9 18 6-6-6-6',
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Chargement du tableau de bord" className="animate-pulse">
      <div className="h-72 rounded-[2rem] bg-slate-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-44 rounded-2xl bg-white" />
        ))}
      </div>
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  const dashboard = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => dashboardService.get(),
  });

  if (dashboard.isPending) return <DashboardSkeleton />;
  if (dashboard.isError) {
    return (
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-xl">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-2xl font-black text-rose-700">
          !
        </span>
        <h1 className="mt-4 text-2xl font-black text-slate-950">Tableau de bord indisponible</h1>
        <p role="alert" className="mt-2 text-slate-600">
          {toApiError(dashboard.error).message}
        </p>
        <button
          className="button-primary mt-6"
          type="button"
          onClick={() => void dashboard.refetch()}
        >
          Réessayer
        </button>
      </section>
    );
  }

  if (!user) return null;

  const roleInterface = getRoleInterface(user.role);
  const firstName = user.name.split(' ').find(Boolean) ?? 'bienvenue';
  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <section>
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 px-6 py-8 text-white shadow-[0_28px_80px_-34px_rgba(6,78,59,0.75)] sm:px-9 sm:py-10 lg:px-12">
        <div
          className="absolute -right-20 -top-32 size-80 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute -right-6 -top-16 size-52 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-0 h-48 w-80 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.2),transparent_65%)]"
          aria-hidden="true"
        />

        <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-teal-100/75">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                {roleInterface.dashboard.eyebrow}
              </span>
              <span className="capitalize">{today}</span>
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              Bonjour {firstName},
              <span className="block max-w-4xl text-teal-100/75">
                {roleInterface.dashboard.headline}
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-100/70 sm:text-base">
              {roleInterface.dashboard.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={roleInterface.dashboard.primaryAction.to}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-amber-950 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              <DashboardIcon name={roleInterface.dashboard.primaryAction.icon} />
              {roleInterface.dashboard.primaryAction.label}
            </Link>
            <Link
              to={roleInterface.dashboard.secondaryAction.to}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              {roleInterface.dashboard.secondaryAction.label}
              <DashboardIcon name="arrow" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
            Vue d’ensemble
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Indicateurs de votre périmètre
          </h2>
        </div>
        <p className="text-sm font-semibold text-slate-500">Données actualisées depuis l’API</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roleInterface.dashboard.metrics.map((metricKey) => {
          const metric = metricConfig[metricKey];
          return (
            <article
              key={metricKey}
              className={`group relative min-h-44 overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,118,110,0.28)] ${metric.tone}`}
            >
              <div className={`grid size-11 place-items-center rounded-xl ${metric.iconTone}`}>
                <DashboardIcon name={metric.icon} />
              </div>
              <p className="mt-5 text-4xl font-black tracking-tight text-slate-950">
                {dashboard.data[metricKey]}
              </p>
              <h3 className="mt-1 text-sm font-black text-slate-800">{metric.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">{metric.description}</p>
              <span
                className="absolute -bottom-8 -right-8 size-24 rounded-full bg-slate-50 transition group-hover:scale-125"
                aria-hidden="true"
              />
            </article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.45fr_0.75fr]">
        <section
          className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.4)] sm:p-7"
          aria-labelledby="quick-actions-title"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
            Accès direct
          </p>
          <h2 id="quick-actions-title" className="mt-1 text-xl font-black text-slate-950">
            Actions adaptées à votre rôle
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {roleInterface.dashboard.quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-teal-300 hover:bg-teal-50"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-white text-teal-700 shadow-sm transition group-hover:bg-teal-700 group-hover:text-white">
                  <DashboardIcon name={action.icon} />
                </span>
                <strong className="mt-4 block text-sm font-black text-slate-900">
                  {action.label}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{action.detail}</span>
              </Link>
            ))}
          </div>
        </section>

        <aside
          className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.4)] sm:p-7"
          aria-labelledby="status-title"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
            Disponibilité
          </p>
          <h2 id="status-title" className="mt-1 text-xl font-black text-slate-950">
            État du service
          </h2>
          <div className={`mt-5 rounded-2xl p-4 ${isOnline ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className="flex items-center gap-3">
              <span
                className={`grid size-10 place-items-center rounded-xl ${isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
              >
                <span
                  className={`size-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
              </span>
              <span>
                <strong className="block text-sm font-black text-slate-900">
                  {isOnline ? 'Service connecté' : 'Mode hors ligne'}
                </strong>
                <span className="text-xs text-slate-500">
                  {isOnline
                    ? 'Les données peuvent être actualisées'
                    : user.role === 'citizen'
                      ? 'Vos brouillons restent disponibles'
                      : 'Les dernières données restent affichées'}
                </span>
              </span>
            </div>
          </div>
          <Link
            to="/notifications"
            className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3 transition hover:border-amber-200 hover:bg-amber-50"
          >
            <span className="text-sm font-semibold text-slate-500">À consulter</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
              {dashboard.data.unread_notifications} notification
              {dashboard.data.unread_notifications > 1 ? 's' : ''}
            </span>
          </Link>
        </aside>
      </div>
    </section>
  );
}
