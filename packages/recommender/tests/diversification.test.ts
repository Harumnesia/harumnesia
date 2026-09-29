import { describe, expect, it } from 'vitest';

import {
  createRecommender,
  type RecommendationRequestInput,
} from '../src/index.js';
import type { RecommendationPerfume } from '@harumnesia/shared';

import { fixtureDataset, missingnessDataset } from './fixtures.js';

describe('deterministic ranking and MMR diversification', () => {
  it('is deterministic across calls and engine instances', () => {
    const request: RecommendationRequestInput = {
      preferences: { notes: ['vanilla', 'bergamot'], accords: ['woody'] },
      limit: 4,
    };
    const firstEngine = createRecommender(fixtureDataset);
    const first = firstEngine
      .recommend(request)
      .results.map((result) => result.id);
    const repeated = firstEngine
      .recommend(request)
      .results.map((result) => result.id);
    const rebuilt = createRecommender(fixtureDataset)
      .recommend(request)
      .results.map((result) => result.id);

    expect(repeated).toEqual(first);
    expect(rebuilt).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });

  it('uses canonical ID as the final tie-break and honors the result limit', () => {
    const response = createRecommender(fixtureDataset).recommend({ limit: 3 });

    expect(response.results.map((result) => result.id)).toEqual([
      'international-floral',
      'international-unknown',
      'international-woody',
    ]);
  });

  it('uses coverage after score and notes similarity after coverage', () => {
    const coverageOrder = createRecommender(missingnessDataset, {
      mmrLambda: 1,
    }).recommend({
      preferences: { notes: ['vanilla'], occasions: ['night'] },
      limit: 2,
    });

    const tieDataset: RecommendationPerfume[] = [
      {
        id: 'a-gender-match',
        name: 'Gender Match',
        brand: 'A',
        market: 'local',
        gender: 'women',
        concentration: null,
        price: null,
        notes: { top: ['rose'], middle: [], base: [] },
        accords: [],
        occasion: [],
      },
      {
        id: 'z-note-match',
        name: 'Note Match',
        brand: 'Z',
        market: 'local',
        gender: 'men',
        concentration: null,
        price: null,
        notes: { top: ['vanilla'], middle: [], base: [] },
        accords: [],
        occasion: [],
      },
    ];
    const similarityOrder = createRecommender(tieDataset, {
      mmrLambda: 1,
      weights: {
        notes: 0.5,
        accords: 0,
        gender: 0.5,
        occasion: 0,
        concentration: 0,
      },
    }).recommend({
      preferences: { notes: ['vanilla'], genders: ['women'] },
      limit: 2,
    });

    expect(coverageOrder.results[0]?.id).toBe('local-complete');
    expect(coverageOrder.results[0]?.score).toBe(
      coverageOrder.results[1]?.score,
    );
    expect(similarityOrder.results[0]?.id).toBe('z-note-match');
    expect(similarityOrder.results[0]?.score).toBe(
      similarityOrder.results[1]?.score,
    );
  });

  it('places higher relevance first before applying redundancy penalties', () => {
    const response = createRecommender(fixtureDataset, {
      mmrLambda: 0.1,
    }).recommend({
      preferences: { notes: ['vanilla'] },
      limit: 3,
    });

    expect(response.results[0]?.preDiversificationRank).toBe(1);
    expect(response.results[0]?.score).toBeGreaterThanOrEqual(
      response.results[1]?.score ?? 0,
    );
  });

  it('can move a redundant candidate behind a diverse relevant candidate', () => {
    const response = createRecommender(fixtureDataset, {
      mmrLambda: 0.5,
    }).recommend({
      preferences: { notes: ['vanilla', 'bergamot', 'jasmine', 'musk'] },
      limit: 6,
    });
    const twin = response.results.find(
      (result) => result.id === 'local-amber-twin',
    );

    expect(response.results[0]?.id).toBe('local-amber');
    expect(twin?.rank).toBeGreaterThan(2);
    expect(twin?.preDiversificationRank).toBe(2);
  });

  it('validates MMR and weight options', () => {
    expect(() =>
      createRecommender(fixtureDataset, { mmrLambda: 1.1 }),
    ).toThrow();
    expect(() =>
      createRecommender(fixtureDataset, {
        weights: {
          notes: 0,
          accords: 0,
          gender: 0,
          occasion: 0,
          concentration: 0,
        },
      }),
    ).toThrow('At least one recommendation weight must be positive');
  });
});
