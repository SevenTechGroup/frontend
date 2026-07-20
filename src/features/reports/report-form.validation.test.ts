import { describe, expect, it } from 'vitest';
import {
  INITIAL_REPORT_FORM_VALUES,
  firstInvalidStep,
  toCreateReportInput,
  validateCompleteReport,
  validateReportStep,
} from './report-form.validation';

describe('report form validation', () => {
  it('explains how to correct every required field', () => {
    const errors = validateCompleteReport(INITIAL_REPORT_FORM_VALUES);

    expect(errors).toEqual({
      categoryId: 'Choisissez la catégorie qui correspond le mieux à la situation.',
      title: 'Donnez un titre court pour identifier le signalement.',
      description: 'Expliquez précisément ce qui se passe.',
      territoryId: 'Sélectionnez le territoire concerné.',
    });
    expect(firstInvalidStep(errors)).toBe(0);
  });

  it('matches the StoreReportRequest length limits', () => {
    const errors = validateReportStep(1, {
      ...INITIAL_REPORT_FORM_VALUES,
      title: 'a'.repeat(256),
      description: 'Trop court',
    });

    expect(errors.title).toContain('255');
    expect(errors.description).toContain('20');
  });

  it('normalizes a valid form into the API payload', () => {
    expect(
      toCreateReportInput({
        categoryId: '3',
        title: '  Route inondée  ',
        description: '  La route est impraticable depuis ce matin.  ',
        territoryId: '7',
        locationText: '  Près du marché  ',
        priority: 'high',
      }),
    ).toEqual({
      category_id: 3,
      title: 'Route inondée',
      description: 'La route est impraticable depuis ce matin.',
      territory_id: 7,
      location_text: 'Près du marché',
      priority: 'high',
    });
  });
});
