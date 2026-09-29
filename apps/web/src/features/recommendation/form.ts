import type { RecommendationRequestInput } from '@harumnesia/recommender';

import type { DiscoveryFormState } from './types.js';

function cleanTerms(values: readonly string[], uppercase = false): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) =>
          uppercase
            ? value.toLocaleUpperCase('en-US')
            : value.toLocaleLowerCase('en-US'),
        ),
    ),
  ];
}

export function validateDiscoveryForm(
  form: DiscoveryFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.maxBudget !== '') {
    const amount = Number(form.maxBudget);
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      errors.maxBudget = 'Enter a positive whole-number budget.';
    }
  }
  return errors;
}

export function toRecommendationRequest(
  form: DiscoveryFormState,
): RecommendationRequestInput {
  const preferences: NonNullable<RecommendationRequestInput['preferences']> =
    {};
  const filters: NonNullable<RecommendationRequestInput['filters']> = {};

  const preferredNotes = cleanTerms(form.preferredNotes);
  const preferredAccords = cleanTerms(form.preferredAccords);
  const preferredOccasions = cleanTerms(form.preferredOccasions);
  const preferredConcentrations = cleanTerms(
    form.preferredConcentrations,
    true,
  );
  const preferredGenders = [...new Set(form.preferredGenders)];

  if (preferredNotes.length > 0) preferences.notes = preferredNotes;
  if (preferredAccords.length > 0) preferences.accords = preferredAccords;
  if (preferredGenders.length > 0) preferences.genders = preferredGenders;
  if (preferredOccasions.length > 0) {
    preferences.occasions = preferredOccasions;
  }
  if (preferredConcentrations.length > 0) {
    preferences.concentrations = preferredConcentrations;
  }

  if (form.market !== 'all') filters.markets = [form.market];
  if (form.maxBudget !== '') {
    const amount = Number(form.maxBudget);
    if (Number.isFinite(amount) && Number.isInteger(amount) && amount > 0) {
      filters.maxPrice = {
        amount,
        currency: 'IDR',
        unknownPolicy: form.includeUnpriced ? 'include' : 'exclude',
      };
    }
  }

  const strictGenders = [...new Set(form.strictGenders)];
  const strictOccasions = cleanTerms(form.strictOccasions);
  const strictConcentrations = cleanTerms(form.strictConcentrations, true);
  const excludedNotes = cleanTerms(form.excludedNotes);
  if (strictGenders.length > 0) filters.genders = strictGenders;
  if (strictOccasions.length > 0) {
    filters.occasions = {
      values: strictOccasions,
      unknownPolicy: 'exclude',
    };
  }
  if (strictConcentrations.length > 0) {
    filters.concentrations = {
      values: strictConcentrations,
      unknownPolicy: 'exclude',
    };
  }
  if (excludedNotes.length > 0) filters.excludeNotes = excludedNotes;

  return {
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
    ...(Object.keys(preferences).length > 0 ? { preferences } : {}),
    limit: 5,
  };
}
