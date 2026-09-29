import { describe, expect, it } from 'vitest';

import { createRecommender, DEFAULT_LIMIT, MAX_LIMIT } from '../src/index.js';
import { fixtureDataset } from './fixtures.js';

describe('public recommender API', () => {
  it('exposes stats and applies default and custom limits', () => {
    const recommender = createRecommender(fixtureDataset);

    expect(recommender.stats).toEqual({
      perfumes: 6,
      notesVocabulary: 10,
      accordsVocabulary: 4,
    });
    expect(recommender.recommend().results).toHaveLength(DEFAULT_LIMIT);
    expect(recommender.recommend({ limit: 2 }).results).toHaveLength(2);
    expect(() => recommender.recommend({ limit: MAX_LIMIT + 1 })).toThrow();
  });

  it('does not mutate input data, request objects, or internal state through results', () => {
    const dataset = structuredClone(fixtureDataset);
    const originalDataset = structuredClone(dataset);
    const request = {
      preferences: { notes: [' Vanilla '] },
      limit: 1,
    };
    const originalRequest = structuredClone(request);
    const recommender = createRecommender(dataset);
    const first = recommender.recommend(request);

    first.results[0]?.perfume.notes.base.push('mutation');
    expect(dataset).toEqual(originalDataset);
    expect(request).toEqual(originalRequest);
    expect(
      recommender.recommend(request).results[0]?.perfume.notes.base,
    ).not.toContain('mutation');
  });

  it('returns traceable matches and only evidence-backed reasons', () => {
    const response = createRecommender(fixtureDataset).recommend({
      preferences: {
        notes: ['vanilla'],
        accords: ['woody'],
        genders: ['unisex'],
        concentrations: ['EDP'],
        occasions: ['night'],
      },
      limit: 6,
    });
    const international = response.results.find(
      (result) => result.id === 'international-woody',
    );
    const local = response.results.find(
      (result) => result.id === 'local-amber',
    );

    expect(international?.matched.notes).toEqual([
      { term: 'vanilla', stages: ['base'] },
    ]);
    expect(international?.matched.accords).toEqual(['woody']);
    expect(international?.reasons).toEqual([
      'Matches preferred notes: vanilla',
      'Matches preferred accord: woody',
      'Matches unisex gender preference',
    ]);
    expect(international?.reasons.join(' ')).not.toContain('night');
    expect(international?.reasons.join(' ')).not.toContain('EDP');
    expect(local?.reasons).toContain('Matches preferred notes: vanilla');
    expect(local?.reasons.join(' ')).not.toContain('woody');
  });

  it('rejects duplicate IDs and malformed datasets at index construction', () => {
    expect(() =>
      createRecommender([fixtureDataset[0]!, fixtureDataset[0]!]),
    ).toThrow('duplicate IDs');
    expect(() =>
      createRecommender([{ ...fixtureDataset[0]!, name: '' }]),
    ).toThrow();
  });
});
