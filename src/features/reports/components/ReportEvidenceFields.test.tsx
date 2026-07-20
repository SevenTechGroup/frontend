import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ReportEvidenceFields } from './ReportEvidenceFields';

it('asks for GPS only after explicit citizen consent', async () => {
  const originalGeolocation = Object.getOwnPropertyDescriptor(window.navigator, 'geolocation');
  const getCurrentPosition = vi.fn();
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  const onLocationConsentChange = vi.fn();

  try {
    render(
      <ReportEvidenceFields
        photo={null}
        photoPreviewUrl={null}
        coordinates={null}
        locationConsentAccepted={false}
        onPhotoChange={vi.fn()}
        onCoordinatesChange={vi.fn()}
        onLocationConsentChange={onLocationConsentChange}
      />,
    );

    expect(getCurrentPosition).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'Autoriser et utiliser ma position' }),
    );
    expect(onLocationConsentChange).toHaveBeenCalledWith(true);
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  } finally {
    if (originalGeolocation) {
      Object.defineProperty(window.navigator, 'geolocation', originalGeolocation);
    } else {
      Reflect.deleteProperty(window.navigator, 'geolocation');
    }
  }
});
