import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../app/providers/use-auth';
import type { DashboardStats } from '../../../models';
import { useNetworkStatus } from '../../../offline';
import { can } from '../../../security/authorization';
import { dashboardService, queryKeys, toApiError } from '../../../services';

type MetricKey = keyof DashboardStats;

const metricConfig: Array<{
  key: MetricKey;
  label: string;
  description: string;
  icon: 'reports' | 'assignments' | 'notifications' | 'mine' | 'tasks';
  tone: string;
  iconTone: string;
}> = [
  {
    key: 'total_reports',
    label: 'Signalements visibles',
    description: 'Dossiers accessibles selon votre rôle',
    icon: 'reports',
    tone: 'border-teal-100 hover:border-teal-300',
    iconTone: 'bg-teal-50 text-teal-700',
  },
  {
    key: 'total_assignments',
    label: 'Affectations visibles',
    description: 'Interventions suivies par les équipes',
    icon: 'assignments',
    tone: 'border-sky-100 hover:border-sky-300',
    iconTone: 'bg-sky-50 text-sky-700',
  },
  {
    key: 'unread_notifications',
    label: 'Notifications non lues',
    description: 'Mises à jour qui demandent votre attention',
    icon: 'notifications',
    tone: 'border-amber-100 hover:border-amber-300',
    iconTone: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'my_reports',
    label: 'Mes signalements',
    description: 'Signalements créés depuis votre compte',
    icon: 'mine',
    tone: 'border-violet-100 hover:border-violet-300',
    iconTone: 'bg-violet-50 text-violet-700',
  },
  {
    key: 'my_assignments',
    label: 'Mes affectations',
    description: 'Actions qui vous sont personnellement confiées',
    icon: 'tasks',
    tone: 'border-rose-100 hover:border-rose-300',
    iconTone: 'bg-rose-50 text-rose-700',
  },
];

function DashboardIcon({
  name,
  className = 'size-5',
}: {
  name: 'reports' | 'assignments' | 'notifications' | 'mine' | 'tasks' | 'arrow';
  className?: string;
}) {
  const paths = {
    reports: 'M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h7',
    assignments: 'M8 6h11v14H5V6h3Zm0 0V4h6v2M9 11h6m-6 4h4',
    notifications: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4',
    mine: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 9a7 7 0 0 0-14 0',
    tasks: 'm8 12 2.5 2.5L16 9m-8 9h10M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2Z',
    arrow: 'm9 18 6-6-6-6',
  } as const;

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
      <div className="h-64 rounded-[2rem] bg-slate-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
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
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-2xl">
          !
        </span>
        <h1 className="mt-4 text-2xl font-black text-slate-950">Tableau de bord indisponible</h1>
        <p role="alert" className="mt-2 text-slate-600">
          {isOnline
            ? toApiError(dashboard.error).message
            : 'Aucune donnée enregistrée n’est encore disponible sur cet appareil. Reconnectez-vous une première fois pour préparer le mode hors ligne.'}
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

  const firstName = user?.name.split(' ').find(Boolean) ?? 'bienvenue';
  const today = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
  const canViewAssignments = can(user, 'assignment:view');
  const canCreateAssignments = can(user, 'assignment:create');
  const primaryAction = canCreateAssignments
    ? { to: '/affectations', label: 'Affecter un dossier' }
    : canViewAssignments
      ? { to: '/affectations', label: 'Voir mes affectations' }
      : { to: '/signalements/nouveau', label: 'Nouveau signalement' };
  const heroMessage = canCreateAssignments
    ? 'pilotez les interventions.'
    : canViewAssignments
      ? 'vos missions vous attendent.'
      : 'que souhaitez-vous signaler ?';
  const heroDescription = canCreateAssignments
    ? 'Supervisez les dossiers, répartissez le travail et suivez les indicateurs de l’équipe.'
    : canViewAssignments
      ? 'Retrouvez vos dossiers affectés, mettez leur état à jour et consultez les nouvelles notifications.'
      : 'Retrouvez vos dossiers, suivez leur traitement et transmettez une nouvelle alerte en quelques étapes.';
  const quickActions = canViewAssignments
    ? [
        {
          to: '/affectations',
          label: canCreateAssignments ? 'Gérer les affectations' : 'Mes affectations',
          detail: canCreateAssignments ? 'Répartir les dossiers' : 'Avancer mes interventions',
          icon: 'assignments' as const,
        },
        {
          to: '/signalements',
          label: 'File des signalements',
          detail: 'Rechercher et filtrer les dossiers',
          icon: 'reports' as const,
        },
        {
          to: '/notifications',
          label: 'Centre de notifications',
          detail: 'Consulter les nouvelles alertes',
          icon: 'notifications' as const,
        },
      ]
    : [
        {
          to: '/signalements/nouveau',
          label: 'Créer une alerte',
          detail: 'Parcours guidé en 5 étapes',
          icon: 'reports' as const,
        },
        {
          to: '/signalements',
          label: 'Suivre mes dossiers',
          detail: 'Consulter les changements',
          icon: 'mine' as const,
        },
        {
          to: '/brouillons',
          label: 'Reprendre un brouillon',
          detail: 'Continuer même hors ligne',
          icon: 'tasks' as const,
        },
      ];

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
          className="absolute bottom-0 right-0 h-40 w-72 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.16),transparent_65%)]"
          aria-hidden="true"
        />

        <div className="relative grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-bold capitalize text-teal-200">{today}</p>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              Bonjour {firstName},<span className="block text-teal-100/75">{heroMessage}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-100/70 sm:text-base">
              {heroDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={primaryAction.to}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-black text-amber-950 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              <span className="text-xl leading-none">+</span>
              {primaryAction.label}
            </Link>
            <Link
              to="/signalements"
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur transition hover:bg-white/15"
            >
              Voir mes dossiers
              <DashboardIcon name="arrow" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
            Vue d’ensemble
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            Vos indicateurs
          </h2>
        </div>
        <p className="text-sm font-semibold text-slate-500">
          {isOnline
            ? 'Données actualisées depuis le serveur'
            : 'Dernières données enregistrées sur cet appareil'}
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricConfig.map((metric) => (
          <article
            key={metric.key}
            className={`group relative min-h-44 overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,118,110,0.28)] ${metric.tone}`}
          >
            <div className={`grid size-11 place-items-center rounded-xl ${metric.iconTone}`}>
              <DashboardIcon name={metric.icon} />
            </div>
            <p className="mt-5 text-4xl font-black tracking-tight text-slate-950">
              {dashboard.data[metric.key]}
            </p>
            <h3 className="mt-1 text-sm font-black text-slate-800">{metric.label}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">{metric.description}</p>
            <span
              className="absolute -bottom-8 -right-8 size-24 rounded-full bg-slate-50 transition group-hover:scale-125"
              aria-hidden="true"
            />
          </article>
        ))}
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
            Actions rapides
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {quickActions.map((action) => (
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
            Votre espace
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
                    : 'Les données enregistrées restent consultables'}
                </span>
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm font-semibold text-slate-500">À consulter</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
              {dashboard.data.unread_notifications} notification
              {dashboard.data.unread_notifications > 1 ? 's' : ''}
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}
