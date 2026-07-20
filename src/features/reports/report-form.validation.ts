import type { CreateReportInput, ReportPriority } from '../../models';

export const REPORT_FORM_STEPS = [
  { shortLabel: 'Catégorie', title: 'Quelle situation signalez-vous ?' },
  { shortLabel: 'Description', title: 'Décrivez ce qui se passe' },
  { shortLabel: 'Lieu', title: 'Où cela se passe-t-il ?' },
  { shortLabel: 'Résumé', title: 'Vérifiez votre signalement' },
  { shortLabel: 'Envoi', title: 'Votre signalement est prêt' },
] as const;

export interface ReportFormValues {
  categoryId: string;
  title: string;
  description: string;
  territoryId: string;
  locationText: string;
  priority: ReportPriority;
}

export type ReportFormField = keyof ReportFormValues;
export type ReportFormErrors = Partial<Record<ReportFormField, string>>;

export const INITIAL_REPORT_FORM_VALUES: ReportFormValues = {
  categoryId: '',
  title: '',
  description: '',
  territoryId: '',
  locationText: '',
  priority: 'medium',
};

const FIELD_STEP: Record<ReportFormField, number> = {
  categoryId: 0,
  priority: 0,
  title: 1,
  description: 1,
  territoryId: 2,
  locationText: 2,
};

export function validateReportStep(step: number, values: ReportFormValues): ReportFormErrors {
  const errors: ReportFormErrors = {};

  if (step === 0) {
    if (!Number.isInteger(Number(values.categoryId)) || Number(values.categoryId) <= 0) {
      errors.categoryId = 'Choisissez la catégorie qui correspond le mieux à la situation.';
    }
  }

  if (step === 1) {
    const title = values.title.trim();
    const description = values.description.trim();

    if (!title) errors.title = 'Donnez un titre court pour identifier le signalement.';
    else if (title.length > 255) errors.title = 'Le titre ne doit pas dépasser 255 caractères.';

    if (!description) errors.description = 'Expliquez précisément ce qui se passe.';
    else if (description.length < 20) {
      errors.description = 'Ajoutez quelques détails : 20 caractères minimum.';
    } else if (description.length > 1000) {
      errors.description = 'Raccourcissez la description à 1 000 caractères maximum.';
    }
  }

  if (step === 2) {
    if (!Number.isInteger(Number(values.territoryId)) || Number(values.territoryId) <= 0) {
      errors.territoryId = 'Sélectionnez le territoire concerné.';
    }
    if (values.locationText.trim().length > 500) {
      errors.locationText = 'Le repère ne doit pas dépasser 500 caractères.';
    }
  }

  return errors;
}

export function validateCompleteReport(values: ReportFormValues): ReportFormErrors {
  return [0, 1, 2].reduce<ReportFormErrors>(
    (errors, step) => ({ ...errors, ...validateReportStep(step, values) }),
    {},
  );
}

export function firstInvalidStep(errors: ReportFormErrors): number {
  const fields = Object.keys(errors) as ReportFormField[];
  return fields.length === 0 ? 0 : Math.min(...fields.map((field) => FIELD_STEP[field]));
}

export function toCreateReportInput(values: ReportFormValues): CreateReportInput {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category_id: Number(values.categoryId),
    territory_id: Number(values.territoryId),
    location_text: values.locationText.trim() || null,
    priority: values.priority,
  };
}
