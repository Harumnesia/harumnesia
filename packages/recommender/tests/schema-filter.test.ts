import { describe, expect, it } from 'vitest';

import {
  createRecommender,
  RecommendationRequestSchema,
} from '../src/index.js';
import { fixtureDataset } from './fixtures.js';

describe('recommendation request schema', () => {
  it('normalizes and deduplicates user-provided terms', () => {
    const parsed = RecommendationRequestSchema.parse({
      preferences: {
        notes: [' Vanilla ', 'vanilla', ''],
        accords: [' WOODY ', 'woody'],
        concentrations: [' edp ', 'EDP'],
      },
      filters: {
        excludeNotes: [' Musk ', 'musk'],
        occasions: { values: [' NIGHT ', 'night'] },
      },
    });

    expect(parsed.preferences).toEqual({
      notes: ['vanilla'],
      accords: ['woody'],
      concentrations: ['EDP'],
    });
    expect(parsed.filters?.excludeNotes).toEqual(['musk']);
    expect(parsed.filters?.occasions).toEqual({
      values: ['night'],
      unknownPolicy: 'include',
    });
    expect(parsed.limit).toBe(5);
  });

  it('rejects unknown fields and invalid limits, enums, and prices', () => {
    expect(() => RecommendationRequestSchema.parse({ extra: true })).toThrow();
    expect(() => RecommendationRequestSchema.parse({ limit: 21 })).toThrow();
    expect(() =>
      RecommendationRequestSchema.parse({
        filters: { markets: ['regional'] },
      }),
    ).toThrow();
    expect(() =>
      RecommendationRequestSchema.parse({
        filters: { maxPrice: { amount: 0, currency: 'USD' } },
      }),
    ).toThrow();
  });
});

describe('hard filters', () => {
  const recommender = createRecommender(fixtureDataset);

  it('filters market and gender with exact canonical matching', () => {
    const local = recommender.recommend({
      filters: { markets: ['local'] },
      limit: 20,
    });
    const women = recommender.recommend({
      filters: { genders: ['women'] },
      limit: 20,
    });

    expect(
      local.results.every((result) => result.perfume.market === 'local'),
    ).toBe(true);
    expect(local.results).toHaveLength(3);
    expect(women.results.map((result) => result.id)).toEqual([
      'international-floral',
      'local-amber',
      'local-amber-twin',
    ]);
  });

  it('filters known prices above the maximum', () => {
    const response = recommender.recommend({
      filters: {
        markets: ['local'],
        maxPrice: { amount: 475_000, currency: 'IDR' },
      },
      limit: 20,
    });

    expect(response.results.map((result) => result.id)).toEqual([
      'local-amber',
      'local-citrus',
    ]);
  });

  it('includes unknown prices by default and can exclude them explicitly', () => {
    const included = recommender.recommend({
      filters: { maxPrice: { amount: 350_000, currency: 'IDR' } },
      limit: 20,
    });
    const excluded = recommender.recommend({
      filters: {
        maxPrice: {
          amount: 350_000,
          currency: 'IDR',
          unknownPolicy: 'exclude',
        },
      },
      limit: 20,
    });

    expect(included.results.map((result) => result.id)).toEqual([
      'international-floral',
      'international-unknown',
      'international-woody',
      'local-citrus',
    ]);
    expect(excluded.results.map((result) => result.id)).toEqual([
      'local-citrus',
    ]);
  });

  it('applies missing-value policy to concentration and occasion filters', () => {
    const concentrationIncluded = recommender.recommend({
      filters: { concentrations: { values: ['edp'] } },
      limit: 20,
    });
    const concentrationExcluded = recommender.recommend({
      filters: {
        concentrations: { values: ['EDP'], unknownPolicy: 'exclude' },
      },
      limit: 20,
    });
    const occasionIncluded = recommender.recommend({
      filters: { occasions: { values: ['night'] } },
      limit: 20,
    });
    const occasionExcluded = recommender.recommend({
      filters: {
        occasions: { values: ['night'], unknownPolicy: 'exclude' },
      },
      limit: 20,
    });

    expect(concentrationIncluded.results).toHaveLength(5);
    expect(concentrationExcluded.results.map((result) => result.id)).toEqual([
      'local-amber',
      'local-amber-twin',
    ]);
    expect(occasionIncluded.results).toHaveLength(5);
    expect(occasionExcluded.results.map((result) => result.id)).toEqual([
      'local-amber',
      'local-amber-twin',
    ]);
  });

  it('excludes candidate IDs and candidates containing excluded notes', () => {
    const response = recommender.recommend({
      filters: {
        excludeIds: ['local-citrus'],
        excludeNotes: ['vanilla'],
      },
      limit: 20,
    });

    expect(response.results.map((result) => result.id)).toEqual([
      'international-floral',
      'international-unknown',
    ]);
  });
});
