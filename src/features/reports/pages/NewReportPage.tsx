import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ReportCoordinates, ReportPriority } from '../../../models';
import { draftRepository, syncService, useNetworkStatus } from '../../../offline';
import { queryKeys, referenceService, reportService, toApiError } from '../../../services';
import {
  INITIAL_REPORT_FORM_VALUES,
  REPORT_FORM_STEPS,
  firstInvalidStep,
  toCreateReportInput,
  validateCompleteReport,
  validateReportStep,
  type ReportFormErrors,
  type ReportFormField,
  type ReportFormValues,
} from '../report-form.validation';
import { ReportEvidenceFields } from '../components/ReportEvidenceFields';

const PRIORITIES: Array<{
  value: ReportPriority;
  label: string;
  description: string;
  accent: string;
}> = [
  {
    value: 'low',
    label: 'Faible',
    description: 'Peut être traité normalement',
    accent: 'bg-sky-500',
  },
  {
    value: 'medium',
    label: 'Moyenne',
    description: 'Nécessite une intervention prochaine',
    accent: 'bg-amber-500',
  },
  {
    value: 'high',
    label: 'Haute',
    description: 'Risque immédiat pour les personnes',
    accent: 'bg-rose-500',
  },
];

const API_FIELD_MAP: Record<string, ReportFormField> = {
  category_id: 'categoryId',
  title: 'title',
  description: 'description',
  territory_id: 'territoryId',
  location_text: 'locationText',
  priority: 'priority',
};

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-2 flex items-start gap-2 text-sm font-semibold text-rose-700"
    >
      <svg className="mt-0.5 size-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 8v5m0 3.5v.01M10.3 3.7 2.6 17a2 2 0 0 0 1.73 3h15.34a2 2 0 0 0 1.73-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {message}
    </p>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <div aria-label="Progression du signalement">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-black text-teal-950">
          Étape {currentStep + 1} sur {REPORT_FORM_STEPS.length}
        </span>
        <span className="font-semibold text-slate-500">
          {Math.round(((currentStep + 1) / REPORT_FORM_STEPS.length) * 100)} %
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-600 to-emerald-400 transition-[width] duration-500"
          style={{ width: `${((currentStep + 1) / REPORT_FORM_STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="mt-5 hidden grid-cols-5 gap-2 md:grid">
        {REPORT_FORM_STEPS.map((step, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          return (
            <li
              key={step.shortLabel}
              aria-current={active ? 'step' : undefined}
              className={`rounded-xl px-2 py-2 text-center text-xs font-bold ${
                active
                  ? 'bg-teal-700 text-white shadow-lg shadow-teal-900/15'
                  : completed
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-400'
              }`}
            >
              <span className="mx-auto mb-1 grid size-6 place-items-center rounded-full border border-current">
                {completed ? '✓' : index + 1}
              </span>
              {step.shortLabel}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function NewReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestedDraftId = searchParams.get('brouillon');
  const [clientSubmissionId] = useState(() => requestedDraftId ?? crypto.randomUUID());
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<ReportFormValues>(INITIAL_REPORT_FORM_VALUES);
  const [compressedPhoto, setCompressedPhoto] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<ReportCoordinates | null>(null);
  const [locationConsentAccepted, setLocationConsentAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ReportFormErrors>({});
  const [draftLoading, setDraftLoading] = useState(Boolean(requestedDraftId));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => referenceService.categories(),
  });
  const territories = useQuery({
    queryKey: queryKeys.territories,
    queryFn: () => referenceService.territories(),
  });
  const createReport = useMutation({
    mutationFn: () =>
      reportService.create(toCreateReportInput(values), clientSubmissionId, {
        photo: compressedPhoto,
        coordinates,
        locationConsentAccepted,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.drafts }),
        queryClient.invalidateQueries({ queryKey: queryKeys.syncQueue }),
      ]);
    },
  });

  const selectedCategory = useMemo(
    () => categories.data?.find((category) => category.id === Number(values.categoryId)),
    [categories.data, values.categoryId],
  );
  const selectedTerritory = useMemo(
    () => territories.data?.find((territory) => territory.id === Number(values.territoryId)),
    [territories.data, values.territoryId],
  );
  const selectedPriority = PRIORITIES.find((priority) => priority.value === values.priority);
  const referencesError = categories.error ?? territories.error;
  const currentStepInfo = REPORT_FORM_STEPS[currentStep] ?? REPORT_FORM_STEPS[0];

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  useEffect(() => {
    if (!requestedDraftId) return;
    let cancelled = false;
    setDraftLoading(true);

    void draftRepository
      .get(requestedDraftId)
      .then((draft) => {
        if (cancelled) return;
        if (!draft) {
          setError('Ce brouillon est introuvable sur cet appareil.');
          return;
        }
        setValues({
          categoryId: draft.categoryId?.toString() ?? '',
          title: draft.title ?? '',
          description: draft.description ?? '',
          territoryId: draft.territoryId?.toString() ?? '',
          locationText: draft.locationText ?? '',
          priority: draft.priority ?? 'medium',
        });
        setCompressedPhoto(draft.compressedPhoto ?? null);
        setCoordinates(draft.coordinates ?? null);
        setLocationConsentAccepted(draft.locationConsentAccepted ?? false);
        setNotice('Brouillon repris. Vos informations ont été restaurées.');
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(toApiError(caught).message);
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [requestedDraftId]);

  useEffect(() => {
    if (!compressedPhoto) {
      setPhotoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(compressedPhoto);
    setPhotoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [compressedPhoto]);

  const updateValue = <Field extends ReportFormField>(
    field: Field,
    value: ReportFormValues[Field],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setError(null);
    setNotice(null);
  };

  const focusFirstError = () => {
    window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setError(null);
    setNotice(null);
  };

  const goForward = () => {
    const errors = validateReportStep(currentStep, values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError();
      return;
    }
    setCurrentStep((step) => Math.min(step + 1, REPORT_FORM_STEPS.length - 1));
  };

  const saveDraft = async () => {
    await draftRepository.save({
      clientSubmissionId,
      consentAccepted: true,
      ...(values.title.trim() ? { title: values.title.trim() } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(values.categoryId ? { categoryId: Number(values.categoryId) } : {}),
      ...(values.territoryId ? { territoryId: Number(values.territoryId) } : {}),
      ...(values.locationText.trim() ? { locationText: values.locationText.trim() } : {}),
      priority: values.priority,
      ...(compressedPhoto ? { compressedPhoto } : {}),
      ...(coordinates ? { coordinates } : {}),
      locationConsentAccepted,
    });
    setSearchParams({ brouillon: clientSubmissionId }, { replace: true });
    await queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
    setNotice('Brouillon enregistré sur cet appareil. Vous pourrez le reprendre plus tard.');
  };

  const applyApiErrors = (caught: unknown) => {
    const apiError = toApiError(caught);
    const nextErrors: ReportFormErrors = {};
    Object.entries(apiError.fieldErrors).forEach(([apiField, messages]) => {
      const field = API_FIELD_MAP[apiField];
      if (field && messages[0]) nextErrors[field] = messages[0];
    });

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setCurrentStep(firstInvalidStep(nextErrors));
      setError('Certains champs doivent être corrigés avant l’envoi.');
      focusFirstError();
      return;
    }
    setError(apiError.message);
  };

  const sendReport = async () => {
    const errors = validateCompleteReport(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCurrentStep(firstInvalidStep(errors));
      setError('Vérifiez les informations indiquées en rouge.');
      focusFirstError();
      return;
    }

    setError(null);
    setNotice(null);
    try {
      if (!isOnline) {
        await saveDraft();
        await syncService.enqueueReport(
          clientSubmissionId,
          toCreateReportInput(values),
          compressedPhoto || coordinates
            ? {
                photo: compressedPhoto,
                coordinates,
                locationConsentAccepted,
              }
            : undefined,
        );
        await queryClient.invalidateQueries({ queryKey: queryKeys.syncQueue });
        if (compressedPhoto || coordinates) {
          setNotice(
            'Vous êtes hors ligne. Le signalement, la photo et la position sont protégés sur cet appareil et seront envoyés ensemble après reconnexion.',
          );
        } else {
          setNotice(
            'Vous êtes hors ligne. Le signalement est conservé sur cet appareil et sera envoyé après reconnexion.',
          );
        }
        return;
      }

      await createReport.mutateAsync();
      await Promise.all([
        draftRepository.remove(clientSubmissionId),
        syncService.removeBySubmission(clientSubmissionId),
      ]);
      void navigate('/signalements');
    } catch (caught) {
      applyApiErrors(caught);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentStep < REPORT_FORM_STEPS.length - 1) goForward();
    else void sendReport();
  };

  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-45px_rgba(15,78,68,0.45)]">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-400 via-teal-500 to-emerald-400" />
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <aside className="relative overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-900 px-6 py-8 text-white sm:px-9 lg:min-h-[720px] lg:py-12">
          <div className="absolute -right-24 -top-20 size-64 rounded-full border border-white/10" />
          <div className="absolute -right-8 -top-8 size-36 rounded-full bg-amber-400/10 blur-xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-teal-50 backdrop-blur">
              <span className="size-2 rounded-full bg-amber-400" />
              Espace citoyen
            </span>
            <h1 className="mt-6 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Signalez.
              <br />
              Nous agissons.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-teal-100/80">
              Quelques informations suffisent pour orienter votre alerte vers la bonne équipe.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm lg:mt-12">
              <StepProgress currentStep={currentStep} />
            </div>

            <div className="mt-6 grid gap-3 text-sm text-teal-50/90 sm:grid-cols-3 lg:mt-10 lg:grid-cols-1">
              {[
                ['01', 'Saisie sécurisée', 'Vos informations restent protégées.'],
                ['02', 'Brouillon local', 'Continuez même avec un réseau instable.'],
                ['03', 'Suivi transparent', 'Retrouvez ensuite l’avancement.'],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-3 rounded-xl p-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 font-black text-amber-300">
                    {number}
                  </span>
                  <span>
                    <strong className="block font-bold text-white">{title}</strong>
                    <span className="mt-0.5 block text-xs leading-5 text-teal-100/65">
                      {description}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="px-5 py-8 sm:px-10 sm:py-12 lg:px-12">
          <form ref={formRef} noValidate onSubmit={handleSubmit}>
            <header className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
                {currentStepInfo.shortLabel}
              </p>
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mt-2 text-2xl font-black tracking-tight text-slate-950 outline-none sm:text-3xl"
              >
                {currentStepInfo.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500" aria-live="polite">
                {currentStep === 0 && 'Sélectionnez la catégorie et le niveau d’urgence.'}
                {currentStep === 1 && 'Un titre clair et quelques détails aideront les équipes.'}
                {currentStep === 2 && 'Indiquez le territoire et, si possible, un repère précis.'}
                {currentStep === 3 && 'Relisez les informations avant de continuer.'}
                {currentStep === 4 && 'Vous pouvez encore revenir en arrière avant l’envoi.'}
              </p>
            </header>

            {notice && (
              <div
                role="status"
                className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm font-semibold leading-6 text-teal-900"
              >
                {notice}
              </div>
            )}
            {(error || referencesError) && (
              <div
                role="alert"
                className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
              >
                <p className="font-bold">{error ?? toApiError(referencesError).message}</p>
                {referencesError && (
                  <button
                    type="button"
                    className="mt-3 font-black underline underline-offset-4"
                    onClick={() => void Promise.all([categories.refetch(), territories.refetch()])}
                  >
                    Réessayer le chargement
                  </button>
                )}
              </div>
            )}

            <div className="min-h-[340px]">
              {currentStep === 0 && (
                <div className="space-y-7">
                  <fieldset>
                    <legend className="text-sm font-black text-slate-800">
                      Catégorie du signalement
                    </legend>
                    <label className="sr-only" htmlFor="categoryId">
                      Catégorie du signalement
                    </label>
                    <select
                      id="categoryId"
                      className="field mt-3 min-h-14"
                      value={values.categoryId}
                      disabled={categories.isPending}
                      aria-invalid={Boolean(fieldErrors.categoryId)}
                      aria-describedby={fieldErrors.categoryId ? 'categoryId-error' : undefined}
                      onChange={(event) => updateValue('categoryId', event.target.value)}
                    >
                      <option value="">
                        {categories.isPending ? 'Chargement…' : 'Choisir une catégorie'}
                      </option>
                      {categories.data?.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <FieldError id="categoryId-error" message={fieldErrors.categoryId} />
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-black text-slate-800">Niveau d’urgence</legend>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {PRIORITIES.map((priority) => (
                        <label
                          key={priority.value}
                          className={`relative cursor-pointer rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-teal-400 ${
                            values.priority === priority.value
                              ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/15'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <input
                            className="sr-only"
                            type="radio"
                            name="priority"
                            value={priority.value}
                            checked={values.priority === priority.value}
                            onChange={() => updateValue('priority', priority.value)}
                          />
                          <span className={`mb-3 block size-2.5 rounded-full ${priority.accent}`} />
                          <span className="block text-sm font-black text-slate-900">
                            {priority.label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {priority.description}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-black text-slate-800" htmlFor="title">
                      Titre du signalement
                    </label>
                    <input
                      id="title"
                      className="field min-h-14"
                      value={values.title}
                      maxLength={255}
                      placeholder="Ex. Route coupée après les pluies"
                      aria-invalid={Boolean(fieldErrors.title)}
                      aria-describedby={fieldErrors.title ? 'title-error' : 'title-help'}
                      onChange={(event) => updateValue('title', event.target.value)}
                    />
                    <span id="title-help" className="mt-2 block text-xs font-normal text-slate-500">
                      {values.title.length}/255 caractères
                    </span>
                    <FieldError id="title-error" message={fieldErrors.title} />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-black text-slate-800"
                      htmlFor="description"
                    >
                      Description détaillée
                    </label>
                    <textarea
                      id="description"
                      className="field min-h-44 resize-y"
                      value={values.description}
                      maxLength={1000}
                      placeholder="Décrivez ce que vous observez, depuis quand et les personnes concernées…"
                      aria-invalid={Boolean(fieldErrors.description)}
                      aria-describedby={
                        fieldErrors.description ? 'description-error' : 'description-help'
                      }
                      onChange={(event) => updateValue('description', event.target.value)}
                    />
                    <span
                      id="description-help"
                      className="mt-2 flex justify-between text-xs font-normal text-slate-500"
                    >
                      <span>20 caractères minimum</span>
                      <span>{values.description.length}/1 000</span>
                    </span>
                    <FieldError id="description-error" message={fieldErrors.description} />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label
                      className="block text-sm font-black text-slate-800"
                      htmlFor="territoryId"
                    >
                      Territoire concerné
                    </label>
                    <select
                      id="territoryId"
                      className="field min-h-14"
                      value={values.territoryId}
                      disabled={territories.isPending}
                      aria-invalid={Boolean(fieldErrors.territoryId)}
                      aria-describedby={fieldErrors.territoryId ? 'territoryId-error' : undefined}
                      onChange={(event) => updateValue('territoryId', event.target.value)}
                    >
                      <option value="">
                        {territories.isPending ? 'Chargement…' : 'Choisir un territoire'}
                      </option>
                      {territories.data?.map((territory) => (
                        <option key={territory.id} value={territory.id}>
                          {territory.name}
                        </option>
                      ))}
                    </select>
                    <FieldError id="territoryId-error" message={fieldErrors.territoryId} />
                  </div>

                  <div>
                    <label
                      className="block text-sm font-black text-slate-800"
                      htmlFor="locationText"
                    >
                      Quartier ou point de repère{' '}
                      <span className="font-medium text-slate-400">(facultatif)</span>
                    </label>
                    <input
                      id="locationText"
                      className="field min-h-14"
                      value={values.locationText}
                      maxLength={500}
                      placeholder="Ex. À 200 m du marché central"
                      aria-invalid={Boolean(fieldErrors.locationText)}
                      aria-describedby={
                        fieldErrors.locationText ? 'locationText-error' : 'locationText-help'
                      }
                      onChange={(event) => updateValue('locationText', event.target.value)}
                    />
                    <span
                      id="locationText-help"
                      className="mt-2 block text-xs font-normal text-slate-500"
                    >
                      Une saisie manuelle suffit ; aucune localisation GPS n’est demandée.
                    </span>
                    <FieldError id="locationText-error" message={fieldErrors.locationText} />
                  </div>

                  <ReportEvidenceFields
                    photo={compressedPhoto}
                    photoPreviewUrl={photoPreviewUrl}
                    coordinates={coordinates}
                    locationConsentAccepted={locationConsentAccepted}
                    onPhotoChange={(photo) => {
                      setCompressedPhoto(photo);
                      setNotice(null);
                    }}
                    onCoordinatesChange={setCoordinates}
                    onLocationConsentChange={setLocationConsentAccepted}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-5">
                    <dl>
                      <SummaryRow
                        label="Catégorie"
                        value={selectedCategory?.name ?? 'Non renseignée'}
                      />
                      <SummaryRow label="Titre" value={values.title || 'Non renseigné'} />
                      <SummaryRow
                        label="Description"
                        value={values.description || 'Non renseignée'}
                      />
                      <SummaryRow
                        label="Lieu"
                        value={
                          [selectedTerritory?.name, values.locationText]
                            .filter(Boolean)
                            .join(' · ') || 'Non renseigné'
                        }
                      />
                      <SummaryRow
                        label="Urgence"
                        value={selectedPriority?.label ?? values.priority}
                      />
                      <SummaryRow
                        label="Photo"
                        value={
                          compressedPhoto
                            ? `Photo compressée prête (${Math.max(1, Math.round(compressedPhoto.size / 1024))} Ko)`
                            : 'Aucune photo'
                        }
                      />
                      <SummaryRow
                        label="Position GPS"
                        value={
                          coordinates
                            ? `Ajoutée avec consentement · précision ${Math.round(coordinates.accuracy)} m`
                            : 'Non utilisée'
                        }
                      />
                    </dl>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      ['Modifier la catégorie', 0],
                      ['Modifier la description', 1],
                      ['Modifier le lieu', 2],
                    ].map(([label, step]) => (
                      <button
                        key={label}
                        type="button"
                        className="rounded-lg px-3 py-2 text-sm font-bold text-teal-800 underline decoration-teal-300 underline-offset-4 hover:bg-teal-50"
                        onClick={() => goToStep(Number(step))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-6 sm:p-8">
                  <div
                    className="grid size-14 place-items-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-900/20"
                    aria-hidden="true"
                  >
                    <svg className="size-7" viewBox="0 0 24 24" fill="none">
                      <path
                        d="m5 12 4 4L19 6"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-5 text-xl font-black text-teal-950">
                    Tout est prêt pour l’envoi
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-teal-900/75">
                    Après l’envoi, le signalement apparaîtra dans votre espace de suivi. En cas de
                    coupure réseau, il sera conservé localement sans perdre votre saisie.
                  </p>
                  <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-teal-950">
                    <span
                      className={`size-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    />
                    {isOnline ? 'Connexion disponible' : 'Mode hors ligne : envoi différé'}
                  </div>
                  {(compressedPhoto || coordinates) && (
                    <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-semibold leading-6 text-teal-950">
                      {isOnline
                        ? 'La photo sera envoyée vers le stockage Cloudinary privé et la position sera enregistrée avec votre consentement.'
                        : 'La photo et la position resteront protégées dans votre brouillon jusqu’à votre reconnexion.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            <footer className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      type="button"
                      className="button-secondary"
                      disabled={createReport.isPending}
                      onClick={() => goToStep(currentStep - 1)}
                    >
                      Précédent
                    </button>
                  )}
                  <button
                    type="button"
                    className="min-h-11 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-teal-800"
                    disabled={createReport.isPending || draftLoading}
                    onClick={() => void saveDraft().catch(applyApiErrors)}
                  >
                    Enregistrer le brouillon
                  </button>
                </div>

                <button
                  className="button-primary inline-flex items-center justify-center gap-2 px-6"
                  type="submit"
                  disabled={
                    createReport.isPending ||
                    draftLoading ||
                    categories.isPending ||
                    territories.isPending
                  }
                >
                  {createReport.isPending
                    ? 'Envoi en cours…'
                    : currentStep === REPORT_FORM_STEPS.length - 1
                      ? isOnline
                        ? 'Envoyer maintenant'
                        : 'Conserver hors ligne'
                      : currentStep === REPORT_FORM_STEPS.length - 2
                        ? 'Confirmer les informations'
                        : 'Continuer'}
                  {!createReport.isPending && (
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="m9 18 6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </footer>
          </form>
        </div>
      </div>
    </section>
  );
}
