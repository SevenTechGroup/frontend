import { useRef, useState, type ChangeEvent } from 'react';
import type { ReportCoordinates } from '../../../models';
import {
  REPORT_PHOTO_ACCEPT,
  compressReportPhoto,
  formatPhotoSize,
} from '../report-evidence.service';

interface ReportEvidenceFieldsProps {
  photo: Blob | null;
  photoPreviewUrl: string | null;
  coordinates: ReportCoordinates | null;
  locationConsentAccepted: boolean;
  onPhotoChange: (photo: Blob | null) => void;
  onCoordinatesChange: (coordinates: ReportCoordinates | null) => void;
  onLocationConsentChange: (accepted: boolean) => void;
}

export function ReportEvidenceFields({
  photo,
  photoPreviewUrl,
  coordinates,
  locationConsentAccepted,
  onPhotoChange,
  onCoordinatesChange,
  onLocationConsentChange,
}: ReportEvidenceFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoError(null);
    setPhotoLoading(true);
    try {
      onPhotoChange(await compressReportPhoto(file));
    } catch (caught) {
      setPhotoError(caught instanceof Error ? caught.message : 'La photo n’a pas pu être traitée.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const requestLocation = () => {
    setLocationError(null);
    onLocationConsentChange(true);

    if (!('geolocation' in navigator)) {
      setLocationError('La géolocalisation n’est pas disponible sur cet appareil.');
      onLocationConsentChange(false);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onCoordinatesChange({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
        setLocationLoading(false);
      },
      (positionError) => {
        const denied = positionError.code === positionError.PERMISSION_DENIED;
        setLocationError(
          denied
            ? 'Accès refusé. Vous pouvez toujours saisir un point de repère manuellement.'
            : 'Position indisponible. Réessayez dehors ou utilisez la saisie manuelle.',
        );
        if (denied) onLocationConsentChange(false);
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="space-y-5">
      <section
        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        aria-labelledby="photo-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="photo-title" className="text-sm font-black text-slate-900">
              Ajouter une photo <span className="font-medium text-slate-400">(facultatif)</span>
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              JPEG, PNG ou WebP · 10 Mo maximum · métadonnées supprimées
            </p>
          </div>
          {photo && (
            <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-800">
              {formatPhotoSize(photo.size)}
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          className="sr-only"
          id="report-photo"
          type="file"
          accept={REPORT_PHOTO_ACCEPT}
          onChange={(event) => void handlePhoto(event)}
        />

        {photo && photoPreviewUrl ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <img
              src={photoPreviewUrl}
              alt="Aperçu de la photo du signalement"
              className="h-48 w-full object-cover"
            />
            <div className="flex flex-wrap gap-2 p-3">
              <button
                type="button"
                className="button-secondary text-sm"
                onClick={() => inputRef.current?.click()}
              >
                Remplacer
              </button>
              <button
                type="button"
                className="button-secondary text-sm text-rose-700"
                onClick={() => onPhotoChange(null)}
              >
                Supprimer la photo
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-4 flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 text-center transition hover:border-teal-500 hover:bg-teal-50"
            disabled={photoLoading}
            onClick={() => inputRef.current?.click()}
          >
            <span
              className="grid size-10 place-items-center rounded-xl bg-teal-100 text-xl text-teal-800"
              aria-hidden="true"
            >
              +
            </span>
            <span className="mt-2 text-sm font-black text-slate-800">
              {photoLoading ? 'Compression en cours…' : 'Choisir une photo'}
            </span>
          </button>
        )}
        {photoError && (
          <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">
            {photoError}
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        aria-labelledby="gps-title"
      >
        <h3 id="gps-title" className="text-sm font-black text-slate-900">
          Position GPS facultative
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Elle n’est demandée qu’après votre accord et ne remplace jamais le repère manuel.
        </p>
        {coordinates ? (
          <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-3">
            <p className="text-sm font-black text-teal-900">Position ajoutée avec votre accord</p>
            <p className="mt-1 text-xs text-teal-800">
              Précision approximative : {Math.round(coordinates.accuracy)} m
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-black text-rose-700 underline underline-offset-4"
              onClick={() => {
                onCoordinatesChange(null);
                onLocationConsentChange(false);
              }}
            >
              Ne plus utiliser ma position
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="button-secondary mt-4 text-sm"
            disabled={locationLoading}
            onClick={requestLocation}
          >
            {locationLoading ? 'Recherche de la position…' : 'Autoriser et utiliser ma position'}
          </button>
        )}
        {locationConsentAccepted && !coordinates && !locationError && (
          <p role="status" className="mt-3 text-xs font-semibold text-teal-700">
            Consentement reçu ; demande de position en cours.
          </p>
        )}
        {locationError && (
          <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">
            {locationError}
          </p>
        )}
      </section>
    </div>
  );
}
