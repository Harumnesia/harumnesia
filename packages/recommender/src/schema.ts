import { z } from 'zod';

import {
  DEFAULT_LIMIT,
  DEFAULT_MMR_LAMBDA,
  DEFAULT_SCORING_WEIGHTS,
  MAX_LIMIT,
} from './constants.js';
import type { ScoringWeights } from './types.js';

const UnknownPolicySchema = z.enum(['include', 'exclude']).default('include');
const PreferenceGenderSchema = z.enum(['men', 'women', 'unisex']);

function deduplicate<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

const LowercaseTermsSchema = z
  .array(z.string())
  .transform((values) =>
    deduplicate(
      values
        .map((value) => value.trim().toLocaleLowerCase('en-US'))
        .filter((value) => value !== ''),
    ),
  );

const UppercaseTermsSchema = z
  .array(z.string())
  .transform((values) =>
    deduplicate(
      values
        .map((value) => value.trim().toLocaleUpperCase('en-US'))
        .filter((value) => value !== ''),
    ),
  );

const IdTermsSchema = z
  .array(z.string())
  .transform((values) =>
    deduplicate(values.map((value) => value.trim()).filter(Boolean)),
  );

const FiltersSchema = z
  .object({
    markets: z
      .array(z.enum(['local', 'international']))
      .transform(deduplicate)
      .optional(),
    genders: z.array(PreferenceGenderSchema).transform(deduplicate).optional(),
    maxPrice: z
      .object({
        amount: z.number().finite().int().positive(),
        currency: z.literal('IDR'),
        unknownPolicy: UnknownPolicySchema,
      })
      .strict()
      .optional(),
    concentrations: z
      .object({
        values: UppercaseTermsSchema,
        unknownPolicy: UnknownPolicySchema,
      })
      .strict()
      .optional(),
    occasions: z
      .object({
        values: LowercaseTermsSchema,
        unknownPolicy: UnknownPolicySchema,
      })
      .strict()
      .optional(),
    excludeNotes: LowercaseTermsSchema.optional(),
    excludeIds: IdTermsSchema.optional(),
  })
  .strict();

const PreferencesSchema = z
  .object({
    notes: LowercaseTermsSchema.optional(),
    accords: LowercaseTermsSchema.optional(),
    genders: z.array(PreferenceGenderSchema).transform(deduplicate).optional(),
    concentrations: UppercaseTermsSchema.optional(),
    occasions: LowercaseTermsSchema.optional(),
  })
  .strict();

export const RecommendationRequestSchema = z
  .object({
    filters: FiltersSchema.optional(),
    preferences: PreferencesSchema.optional(),
    limit: z.number().int().positive().max(MAX_LIMIT).default(DEFAULT_LIMIT),
  })
  .strict();

const WeightsSchema = z
  .object({
    notes: z.number().finite().nonnegative().optional(),
    accords: z.number().finite().nonnegative().optional(),
    gender: z.number().finite().nonnegative().optional(),
    occasion: z.number().finite().nonnegative().optional(),
    concentration: z.number().finite().nonnegative().optional(),
  })
  .strict()
  .optional();

export const RecommenderOptionsSchema = z
  .object({
    weights: WeightsSchema,
    mmrLambda: z.number().finite().min(0).max(1).optional(),
  })
  .strict();

export type RecommendationRequestInput = z.input<
  typeof RecommendationRequestSchema
>;
export type RecommendationRequest = z.output<
  typeof RecommendationRequestSchema
>;

export function resolveRecommenderOptions(options: unknown) {
  const parsed = RecommenderOptionsSchema.parse(options ?? {});
  const weights: ScoringWeights = {
    notes: parsed.weights?.notes ?? DEFAULT_SCORING_WEIGHTS.notes,
    accords: parsed.weights?.accords ?? DEFAULT_SCORING_WEIGHTS.accords,
    gender: parsed.weights?.gender ?? DEFAULT_SCORING_WEIGHTS.gender,
    occasion: parsed.weights?.occasion ?? DEFAULT_SCORING_WEIGHTS.occasion,
    concentration:
      parsed.weights?.concentration ?? DEFAULT_SCORING_WEIGHTS.concentration,
  };
  const totalWeight = Object.values(weights).reduce(
    (total, weight) => total + weight,
    0,
  );
  if (totalWeight <= 0) {
    throw new Error('At least one recommendation weight must be positive.');
  }

  return {
    weights,
    mmrLambda: parsed.mmrLambda ?? DEFAULT_MMR_LAMBDA,
  };
}
