import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReportAttachment } from '../../../models';
import { ReportPhoto } from './ReportPhoto';

const mocks = vi.hoisted(() => ({
  getAttachmentContent: vi.fn(),
}));

vi.mock('../../../services', () => ({
  queryKeys: {
    attachmentContent: (id: number) => ['attachments', id, 'content'],
  },
  reportService: {
    getAttachmentContent: mocks.getAttachmentContent,
  },
  toApiError: (error: unknown) => ({
    message: error instanceof Error ? error.message : 'Erreur inattendue',
  }),
}));

const attachment: ReportAttachment = {
  id: 17,
  report_id: 41,
  provider: 'cloudinary',
  resource_type: 'image',
  delivery_type: 'authenticated',
  format: 'jpg',
  mime_type: 'image/jpeg',
  original_filename: 'preuve.jpg',
  bytes: 450000,
  width: 900,
  height: 600,
  created_at: '2026-07-20T10:00:00.000Z',
  updated_at: '2026-07-20T10:00:00.000Z',
};

function renderPhoto() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return render(
    <ReportPhoto attachment={attachment} alt="Preuve photographique du nid-de-poule" />,
    { wrapper: Wrapper },
  );
}

describe('ReportPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAttachmentContent.mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' }));
  });

  it('charge et affiche la photo privée avec un texte alternatif explicite', async () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report-photo');

    renderPhoto();

    expect(screen.getByText('Chargement de la photo…')).toBeInTheDocument();
    const image = await screen.findByRole('img', {
      name: 'Preuve photographique du nid-de-poule',
    });

    expect(image).toHaveAttribute('src', 'blob:report-photo');
    expect(mocks.getAttachmentContent).toHaveBeenCalledWith(17);
    expect(createObjectUrl).toHaveBeenCalledOnce();
  });

  it('explique clairement une erreur de chargement et permet de réessayer', async () => {
    mocks.getAttachmentContent.mockRejectedValueOnce(new Error('Stockage indisponible'));

    renderPhoto();

    expect(await screen.findByRole('alert')).toHaveTextContent('Photo momentanément indisponible');
    expect(screen.getByText('Stockage indisponible')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Réessayer de charger la photo' }),
    ).toBeInTheDocument();

    await waitFor(() => expect(mocks.getAttachmentContent).toHaveBeenCalledOnce());
  });
});
