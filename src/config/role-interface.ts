import type { DashboardStats, UserRole } from '../models';

export type WorkspaceIcon =
  'dashboard' | 'reports' | 'new' | 'drafts' | 'assignments' | 'notifications';

export type DashboardMetricKey = keyof DashboardStats;

export interface WorkspaceLink {
  to: string;
  label: string;
  icon: WorkspaceIcon;
}

interface RoleInterface {
  label: string;
  workspace: string;
  nav: WorkspaceLink[];
  dashboard: {
    eyebrow: string;
    headline: string;
    description: string;
    primaryAction: WorkspaceLink;
    secondaryAction: WorkspaceLink;
    metrics: DashboardMetricKey[];
    quickActions: Array<WorkspaceLink & { detail: string }>;
  };
  reports: {
    eyebrow: string;
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
  };
}

export const roleInterfaces: Record<UserRole, RoleInterface> = {
  citizen: {
    label: 'Citoyen',
    workspace: 'Espace citoyen',
    nav: [
      { to: '/tableau-de-bord', label: 'Accueil', icon: 'dashboard' },
      { to: '/signalements', label: 'Mes signalements', icon: 'reports' },
      { to: '/signalements/nouveau', label: 'Signaler', icon: 'new' },
      { to: '/brouillons', label: 'Brouillons', icon: 'drafts' },
      { to: '/notifications', label: 'Notifications', icon: 'notifications' },
    ],
    dashboard: {
      eyebrow: 'Votre espace citoyen',
      headline: 'votre vigilance protège la communauté.',
      description:
        'Transmettez une alerte fiable, suivez son traitement et restez informé à chaque étape.',
      primaryAction: { to: '/signalements/nouveau', label: 'Créer un signalement', icon: 'new' },
      secondaryAction: { to: '/signalements', label: 'Suivre mes dossiers', icon: 'reports' },
      metrics: ['my_reports', 'unread_notifications'],
      quickActions: [
        {
          to: '/signalements/nouveau',
          label: 'Créer une alerte',
          detail: 'Parcours guidé et sécurisé',
          icon: 'new',
        },
        {
          to: '/signalements',
          label: 'Suivre mes dossiers',
          detail: 'Consulter leur avancement',
          icon: 'reports',
        },
        {
          to: '/brouillons',
          label: 'Reprendre un brouillon',
          detail: 'Continuer même hors ligne',
          icon: 'drafts',
        },
      ],
    },
    reports: {
      eyebrow: 'Suivi personnel',
      title: 'Mes signalements',
      description:
        'Retrouvez les alertes que vous avez transmises et suivez leur prise en charge en toute transparence.',
      emptyTitle: 'Aucun signalement transmis',
      emptyDescription: 'Votre premier signalement apparaîtra ici dès son envoi.',
    },
  },
  agent: {
    label: 'Agent terrain',
    workspace: 'Centre opérationnel',
    nav: [
      { to: '/tableau-de-bord', label: 'Vue opérationnelle', icon: 'dashboard' },
      { to: '/signalements', label: 'File terrain', icon: 'reports' },
      { to: '/affectations', label: 'Mes interventions', icon: 'assignments' },
      { to: '/notifications', label: 'Notifications', icon: 'notifications' },
    ],
    dashboard: {
      eyebrow: 'Centre opérationnel',
      headline: 'vos interventions prioritaires vous attendent.',
      description:
        'Organisez vos missions, traitez les signalements affectés et partagez un état fiable du terrain.',
      primaryAction: {
        to: '/affectations',
        label: 'Voir mes interventions',
        icon: 'assignments',
      },
      secondaryAction: { to: '/signalements', label: 'Ouvrir la file terrain', icon: 'reports' },
      metrics: ['total_reports', 'my_assignments', 'unread_notifications'],
      quickActions: [
        {
          to: '/affectations',
          label: 'Mes interventions',
          detail: 'Mettre à jour les missions',
          icon: 'assignments',
        },
        {
          to: '/signalements',
          label: 'File terrain',
          detail: 'Analyser les dossiers affectés',
          icon: 'reports',
        },
        {
          to: '/notifications',
          label: 'Centre de notifications',
          detail: 'Voir les nouvelles consignes',
          icon: 'notifications',
        },
      ],
    },
    reports: {
      eyebrow: 'Opérations terrain',
      title: 'File de traitement',
      description:
        'Concentrez-vous sur les signalements qui vous sont affectés et préparez chaque intervention.',
      emptyTitle: 'Aucun dossier dans votre file',
      emptyDescription: 'Les prochaines missions affectées apparaîtront automatiquement ici.',
    },
  },
  manager: {
    label: 'Responsable',
    workspace: 'Poste de commandement',
    nav: [
      { to: '/tableau-de-bord', label: 'Vue exécutive', icon: 'dashboard' },
      { to: '/signalements', label: 'Pilotage', icon: 'reports' },
      { to: '/affectations', label: 'Affectations', icon: 'assignments' },
      { to: '/notifications', label: 'Notifications', icon: 'notifications' },
    ],
    dashboard: {
      eyebrow: 'Poste de commandement',
      headline: 'gardez une longueur d’avance sur les incidents.',
      description:
        'Supervisez l’activité, contrôlez la charge opérationnelle et priorisez les interventions critiques.',
      primaryAction: { to: '/signalements', label: 'Piloter les signalements', icon: 'reports' },
      secondaryAction: {
        to: '/affectations',
        label: 'Suivre les affectations',
        icon: 'assignments',
      },
      metrics: ['total_reports', 'total_assignments', 'unread_notifications'],
      quickActions: [
        {
          to: '/signalements',
          label: 'Vue consolidée',
          detail: 'Prioriser tous les dossiers',
          icon: 'reports',
        },
        {
          to: '/affectations',
          label: 'Charge des équipes',
          detail: 'Suivre chaque intervention',
          icon: 'assignments',
        },
        {
          to: '/notifications',
          label: 'Alertes de pilotage',
          detail: 'Traiter les points d’attention',
          icon: 'notifications',
        },
      ],
    },
    reports: {
      eyebrow: 'Supervision globale',
      title: 'Pilotage des signalements',
      description:
        'Analysez l’ensemble des alertes, identifiez les urgences et coordonnez la réponse opérationnelle.',
      emptyTitle: 'Aucun signalement à superviser',
      emptyDescription: 'Les nouveaux dossiers apparaîtront ici dès leur réception.',
    },
  },
};

export function getRoleInterface(role: UserRole): RoleInterface {
  return roleInterfaces[role];
}
