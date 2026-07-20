export const REPORT_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const MAX_REPORT_PHOTO_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_REPORT_PHOTO_OUTPUT_BYTES = 1_500_000;
const MAX_REPORT_PHOTO_DIMENSION = 1600;
const OUTPUT_QUALITIES = [0.82, 0.68, 0.52] as const;
const SUPPORTED_TYPES = new Set(REPORT_PHOTO_ACCEPT.split(','));

export function validateReportPhoto(file: Pick<File, 'size' | 'type'>): string | null {
  if (!SUPPORTED_TYPES.has(file.type)) {
    return 'Choisissez une image JPEG, PNG ou WebP.';
  }
  if (file.size <= 0) return 'Cette image est vide ou illisible.';
  if (file.size > MAX_REPORT_PHOTO_SOURCE_BYTES) {
    return 'L’image dépasse 10 Mo. Choisissez une photo plus légère.';
  }
  return null;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('La compression de la photo a échoué.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function compressReportPhoto(file: File): Promise<Blob> {
  const validationError = validateReportPhoto(file);
  if (validationError) throw new Error(validationError);

  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, MAX_REPORT_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Votre navigateur ne peut pas compresser cette photo.');

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let compressed: Blob | null = null;
    for (const quality of OUTPUT_QUALITIES) {
      compressed = await canvasToBlob(canvas, quality);
      if (compressed.size <= MAX_REPORT_PHOTO_OUTPUT_BYTES) break;
    }

    if (!compressed || compressed.size > MAX_REPORT_PHOTO_OUTPUT_BYTES) {
      throw new Error('La photo reste trop lourde après compression. Choisissez une autre image.');
    }
    return compressed;
  } finally {
    bitmap.close();
  }
}

export function formatPhotoSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
