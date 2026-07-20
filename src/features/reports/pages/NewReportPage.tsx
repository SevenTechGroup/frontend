import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateReportInput, ReportPriority } from '../../../models';
import { draftRepository, syncService } from '../../../offline';
import { queryKeys, referenceService, reportService, toApiError } from '../../../services';

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function readInput(form: FormData): CreateReportInput {
  return {
    title: stringField(form, 'title').trim(),
    description: stringField(form, 'description').trim(),
    category_id: Number(form.get('category_id')),
    territory_id: Number(form.get('territory_id')),
    location_text: stringField(form, 'location_text').trim() || null,
    priority: (stringField(form, 'priority') || 'medium') as ReportPriority,
  };
}

export function NewReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [clientSubmissionId] = useState(() => crypto.randomUUID());
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
    mutationFn: (input: CreateReportInput) => reportService.create(input, clientSubmissionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.reports });
    },
  });

  const saveDraft = async (form: FormData) => {
    const categoryId = Number(form.get('category_id')) || undefined;
    const territoryId = Number(form.get('territory_id')) || undefined;
    const title = stringField(form, 'title').trim() || undefined;
    const description = stringField(form, 'description').trim() || undefined;
    const locationText = stringField(form, 'location_text').trim() || undefined;

    await draftRepository.save({
      clientSubmissionId,
      consentAccepted: true,
      ...(title === undefined ? {} : { title }),
      ...(description === undefined ? {} : { description }),
      ...(categoryId === undefined ? {} : { categoryId }),
      ...(territoryId === undefined ? {} : { territoryId }),
      ...(locationText === undefined ? {} : { locationText }),
      priority: (stringField(form, 'priority') || 'medium') as ReportPriority,
    });
    setNotice('Brouillon enregistré sur cet appareil.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const input = readInput(form);

    try {
      if (!navigator.onLine) {
        await saveDraft(form);
        await syncService.enqueueReport(clientSubmissionId, input);
        setNotice('Signalement placé dans la file locale. Il sera envoyé après reconnexion.');
        return;
      }

      await createReport.mutateAsync(input);
      await draftRepository.remove(clientSubmissionId);
      void navigate('/signalements');
    } catch (caught) {
      setError(toApiError(caught).message);
    }
  };

  const loadingReferences = categories.isPending || territories.isPending;
  const referencesError = categories.error ?? territories.error;

  return (
    <section className="max-w-2xl">
      <h1 className="page-title">Nouveau signalement</h1>
      <p className="mt-2 text-slate-600">
        Les champs saisis peuvent être conservés localement avant l’envoi.
      </p>

      {notice && <p className="mt-5 rounded-lg bg-teal-50 p-3 text-teal-900">{notice}</p>}
      {(error || referencesError) && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-red-800">
          {error ?? toApiError(referencesError).message}
        </p>
      )}

      <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmit(event)}>
        <label className="block text-sm font-medium">
          Titre
          <input className="field" name="title" required maxLength={255} />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea
            className="field min-h-32"
            name="description"
            required
            minLength={20}
            maxLength={1000}
          />
          <span className="mt-1 block text-xs text-slate-500">Entre 20 et 1 000 caractères.</span>
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Catégorie
            <select
              className="field"
              name="category_id"
              required
              disabled={loadingReferences}
              defaultValue=""
            >
              <option value="" disabled>
                Choisir
              </option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Territoire
            <select
              className="field"
              name="territory_id"
              required
              disabled={loadingReferences}
              defaultValue=""
            >
              <option value="" disabled>
                Choisir
              </option>
              {territories.data?.map((territory) => (
                <option key={territory.id} value={territory.id}>
                  {territory.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm font-medium">
          Repère ou quartier (facultatif)
          <input className="field" name="location_text" maxLength={500} />
        </label>
        <label className="block text-sm font-medium">
          Priorité
          <select className="field" name="priority" defaultValue="medium">
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Haute</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            className="button-primary"
            type="submit"
            disabled={createReport.isPending || loadingReferences}
          >
            {createReport.isPending ? 'Envoi…' : 'Envoyer le signalement'}
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form) return;
              setError(null);
              void saveDraft(new FormData(form)).catch((caught: unknown) => {
                setError(toApiError(caught).message);
              });
            }}
          >
            Enregistrer le brouillon
          </button>
        </div>
      </form>
    </section>
  );
}
