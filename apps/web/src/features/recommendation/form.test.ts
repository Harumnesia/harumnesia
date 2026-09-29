import { describe, expect, it } from 'vitest';

import { toRecommendationRequest, validateDiscoveryForm } from './form.js';
import { INITIAL_DISCOVERY_FORM, type DiscoveryFormState } from './types.js';

function form(overrides: Partial<DiscoveryFormState> = {}): DiscoveryFormState {
  return { ...INITIAL_DISCOVERY_FORM, ...overrides };
}

describe('discovery form adapter', () => {
  it('returns the stable result limit for an empty form', () => {
    expect(toRecommendationRequest(form())).toEqual({ limit: 5 });
  });

  it('normalizes and deduplicates preference terms', () => {
    expect(
      toRecommendationRequest(
        form({ preferredNotes: [' Amber ', 'amber', 'ROSE'] }),
      ).preferences?.notes,
    ).toEqual(['amber', 'rose']);
  });

  it('keeps preferences separate from strict filters', () => {
    const request = toRecommendationRequest(
      form({
        preferredOccasions: ['night'],
        strictOccasions: ['day'],
      }),
    );
    expect(request.preferences?.occasions).toEqual(['night']);
    expect(request.filters?.occasions).toEqual({
      values: ['day'],
      unknownPolicy: 'exclude',
    });
  });

  it('maps market, budget, and unknown-price policy', () => {
    expect(
      toRecommendationRequest(
        form({
          market: 'local',
          maxBudget: '500000',
          includeUnpriced: false,
        }),
      ).filters,
    ).toMatchObject({
      markets: ['local'],
      maxPrice: {
        amount: 500000,
        currency: 'IDR',
        unknownPolicy: 'exclude',
      },
    });
  });

  it('maps concentrations in the canonical uppercase form', () => {
    const request = toRecommendationRequest(
      form({
        preferredConcentrations: ['edp'],
        strictConcentrations: ['edt'],
      }),
    );
    expect(request.preferences?.concentrations).toEqual(['EDP']);
    expect(request.filters?.concentrations).toEqual({
      values: ['EDT'],
      unknownPolicy: 'exclude',
    });
  });

  it('rejects non-positive and fractional budgets', () => {
    expect(validateDiscoveryForm(form({ maxBudget: '0' }))).toHaveProperty(
      'maxBudget',
    );
    expect(validateDiscoveryForm(form({ maxBudget: '1.5' }))).toHaveProperty(
      'maxBudget',
    );
    expect(validateDiscoveryForm(form({ maxBudget: '250000' }))).toEqual({});
  });
});
