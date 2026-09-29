import { describe, expect, it } from 'vitest';

import { createRecommender } from '../src/index.js';
import { createRecommenderIndex } from '../src/indexer.js';
import {
  computeIdf,
  createSparseVector,
  idfWeightedCosine,
} from '../src/similarity.js';
import { fixtureDataset, missingnessDataset } from './fixtures.js';

describe('sparse IDF cosine', () => {
  it('uses smoothed IDF and set semantics', () => {
    const documents = [
      new Set(['common', 'rare']),
      new Set(['common']),
      new Set(['common']),
    ];
    const idf = computeIdf(3, documents);

    expect(idf.get('common')).toBeCloseTo(1);
    expect(idf.get('rare')).toBeCloseTo(Math.log(2) + 1);
    expect(createSparseVector(['rare', 'rare'], idf).terms.size).toBe(1);
  });

  it('returns stable cosine values for identical, partial, disjoint, and empty vectors', () => {
    const idf = new Map([
      ['vanilla', 1],
      ['amber', 2],
    ]);
    const both = createSparseVector(['vanilla', 'amber'], idf);
    const vanilla = createSparseVector(['vanilla'], idf);
    const unknown = createSparseVector(['unknown'], idf);

    expect(idfWeightedCosine(both, both, idf)).toBeCloseTo(1);
    expect(idfWeightedCosine(both, vanilla, idf)).toBeGreaterThan(0);
    expect(idfWeightedCosine(both, vanilla, idf)).toBeLessThan(1);
    expect(idfWeightedCosine(both, unknown, idf)).toBe(0);
    expect(idfWeightedCosine(unknown, unknown, idf)).toBe(0);
  });

  it('counts a note appearing in multiple stages only once', () => {
    const dataset = structuredClone(fixtureDataset);
    dataset[0]?.notes.middle.push('bergamot');
    const index = createRecommenderIndex(dataset);

    expect(index.candidates[0]?.notes.terms.size).toBe(4);
  });
});

describe('missingness-aware scoring', () => {
  it('handles cross-market missingness only through applicable signals', () => {
    const response = createRecommender(missingnessDataset).recommend({
      preferences: {
        notes: ['vanilla'],
        accords: ['woody'],
        occasions: ['night'],
      },
      filters: { maxPrice: { amount: 500_000, currency: 'IDR' } },
      limit: 2,
    });
    const international = response.results.find(
      (result) => result.id === 'international-sparse',
    );
    const local = response.results.find(
      (result) => result.id === 'local-complete',
    );

    expect(local?.score).toBe(1);
    expect(local?.coverage).toBeCloseTo(0.65 / 0.85);
    expect(local?.components.accords).toBeUndefined();
    expect(international?.score).toBe(1);
    expect(international?.coverage).toBeCloseTo(0.75 / 0.85);
    expect(international?.components.occasion).toBeUndefined();
  });

  it('does not treat unavailable metadata as a zero-score mismatch', () => {
    const recommender = createRecommender(missingnessDataset);
    const response = recommender.recommend({
      preferences: { notes: ['vanilla'], occasions: ['night'] },
      filters: { maxPrice: { amount: 500_000, currency: 'IDR' } },
      limit: 2,
    });
    const international = response.results.find(
      (result) => result.id === 'international-sparse',
    );
    const local = response.results.find(
      (result) => result.id === 'local-complete',
    );

    expect(international?.score).toBe(1);
    expect(international?.coverage).toBeCloseTo(0.55 / 0.65);
    expect(international?.components.occasion).toBeUndefined();
    expect(local?.score).toBe(1);
    expect(local?.coverage).toBe(1);
  });

  it('renormalizes around absent accord data and reports coverage separately', () => {
    const recommender = createRecommender(fixtureDataset, {
      weights: {
        notes: 0.5,
        accords: 0.5,
        gender: 0,
        occasion: 0,
        concentration: 0,
      },
    });
    const response = recommender.recommend({
      preferences: { notes: ['vanilla'], accords: ['woody'] },
      limit: 6,
    });
    const local = response.results.find(
      (result) => result.id === 'local-amber',
    );

    expect(local?.components.notes).toBeDefined();
    expect(local?.components.accords).toBeUndefined();
    expect(local?.score).toBe(local?.components.notes?.score);
    expect(local?.coverage).toBe(0.5);
  });

  it('uses centralized default weights in component metadata', () => {
    const response = createRecommender(fixtureDataset).recommend({
      preferences: {
        notes: ['vanilla'],
        accords: ['woody'],
        genders: ['unisex'],
        occasions: ['night'],
        concentrations: ['EDP'],
      },
      limit: 1,
    });

    expect(response.results[0]?.components).toMatchObject({
      notes: { weight: 0.55 },
      accords: { weight: 0.2 },
      gender: { weight: 0.1 },
    });
  });

  it('returns zero score and zero coverage when no scoring preference applies', () => {
    const response = createRecommender(fixtureDataset).recommend({ limit: 1 });

    expect(response.results[0]?.score).toBe(0);
    expect(response.results[0]?.coverage).toBe(0);
    expect(response.diagnostics.requestedWeight).toBe(0);
  });

  it('ignores out-of-vocabulary terms without distorting scores', () => {
    const response = createRecommender(fixtureDataset).recommend({
      preferences: {
        notes: ['vanilla', 'imaginary-note'],
        accords: ['imaginary-accord'],
      },
      limit: 1,
    });

    expect(response.diagnostics.ignoredPreferences).toEqual({
      notes: ['imaginary-note'],
      accords: ['imaginary-accord'],
    });
    expect(response.diagnostics.requestedWeight).toBe(0.55);
    expect(Number.isFinite(response.results[0]?.score)).toBe(true);
  });
});
