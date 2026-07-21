import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ReportAttachment } from '../../../models';
import { queryKeys, reportService, toApiError } from '../../../services';

interface ReportPhotoProps {
  attachment: ReportAttachment;
  alt: string;
  variant?: 'card' | 'detail';
}

export function ReportPhoto({ attachment, alt, variant = 'card' }: ReportPhotoProps) {
  const [source, setSource] = useState<string | null>(null);
  const photo = useQuery({
    queryKey: queryKeys.attachmentContent(attachment.id),
    queryFn: () => reportService.getAttachmentContent(attachment.id),
    staleTime: 15 * 60 * 1000,
  });

  useEffect(() => {
    if (!photo.data) {
      setSource(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(photo.data);
    setSource(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo.data]);

  const frameClassName =
    variant === 'detail' ? 'aspect-[16/10] min-h-64 sm:min-h-80' : 'aspect-[16/9] min-h-44';

  if (photo.isError) {
    return (
      <div
        className={`${frameClassName} flex flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center`}
        role="alert"
      >
        <p className="font-black text-amber-950">Photo momentanément indisponible</p>
        <p className="mt-1 text-sm text-amber-800">
          {toApiError(photo.error).message || 'La preuve photographique n’a pas pu être chargée.'}
        </p>
        <button
          type="button"
          className="mt-3 text-sm font-black text-amber-950 underline underline-offset-4"
          onClick={() => void photo.refetch()}
        >
          Réessayer de charger la photo
        </button>
      </div>
    );
  }

  if (photo.isPending || !source) {
    return (
      <div
        className={`${frameClassName} flex items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500`}
        aria-busy="true"
        role="status"
      >
        Chargement de la photo…
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={alt}
      className={`${frameClassName} w-full rounded-2xl bg-slate-100 object-cover`}
      loading="lazy"
      decoding="async"
    />
  );
}
