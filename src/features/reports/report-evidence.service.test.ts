import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_REPORT_PHOTO_OUTPUT_BYTES,
  MAX_REPORT_PHOTO_SOURCE_BYTES,
  compressReportPhoto,
  validateReportPhoto,
} from './report-evidence.service';

describe('report photo evidence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects unsupported and oversized files with actionable messages', () => {
    expect(validateReportPhoto({ type: 'application/pdf', size: 200 })).toContain('JPEG');
    expect(
      validateReportPhoto({ type: 'image/jpeg', size: MAX_REPORT_PHOTO_SOURCE_BYTES + 1 }),
    ).toContain('10 Mo');
    expect(validateReportPhoto({ type: 'image/webp', size: 200 })).toBeNull();
  });

  it('resizes and re-encodes the image without carrying source EXIF bytes', async () => {
    const close = vi.fn();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ width: 3200, height: 1600, close }),
    );
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage }),
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(new Blob([new Uint8Array(1200)], { type: 'image/jpeg' }));
      }),
    };
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');
    createElement.mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return canvas as unknown as HTMLCanvasElement;
      return originalCreateElement(tagName);
    });

    const source = new File(['EXIF-GPS-SECRET'], 'photo.jpg', { type: 'image/jpeg' });
    const compressed = await compressReportPhoto(source);

    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(compressed.type).toBe('image/jpeg');
    expect(compressed.size).toBeLessThan(MAX_REPORT_PHOTO_OUTPUT_BYTES);
    const compressedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(reader.error ?? new Error('Lecture impossible'));
      reader.readAsText(compressed);
    });
    expect(compressedText).not.toContain('EXIF-GPS-SECRET');
    expect(drawImage).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});
