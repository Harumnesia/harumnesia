import type { RecommendationPerfume } from '@harumnesia/shared';
import type { RecommendationResult } from '@harumnesia/recommender';
import { describe, expect, it } from 'vitest';

import {
  toPerfumeDetailViewModel,
  toRecommendationViewModel,
  visualToneForId,
} from './view-model.js';

const PERFUME: RecommendationPerfume = {
  id: 'local-hrmn-production-test',
  name: 'Production Test',
  brand: 'Harumnesia Lab',
  market: 'local',
  gender: 'unisex',
  concentration: 'EDP',
  price: { amount: 350_000, currency: 'IDR' },
  notes: {
    top: ['bergamot'],
    middle: ['jasmine'],
    base: ['amber'],
  },
  accords: ['floral'],
  occasion: ['night'],
};

const RESULT: RecommendationResult = {
  id: PERFUME.id,
  rank: 2,
  preDiversificationRank: 4,
  score: 0.72,
  coverage: 0.8,
  mmrScore: 0.65,
  components: {},
  matched: {
    notes: [],
    accords: ['floral'],
    occasions: ['night'],
    concentration: 'EDP',
    gender: 'unisex',
  },
  reasons: ['Matches preferred accords: floral'],
  perfume: PERFUME,
};

describe('production view-model mapping', () => {
  it('maps result-safe fields without exposing scoring internals', () => {
    const view = toRecommendationViewModel(RESULT);
    expect(view).toMatchObject({
      id: PERFUME.id,
      rank: 2,
      name: PERFUME.name,
      marketLabel: 'Local',
      genderLabel: 'Unisex',
      reasons: ['Matches preferred accords: floral'],
      keyNotes: ['bergamot', 'jasmine', 'amber'],
    });
    expect(view).not.toHaveProperty('score');
    expect(view).not.toHaveProperty('mmrScore');
    expect(view).not.toHaveProperty('coverage');
  });

  it('assigns a deterministic visual tone from a stable id', () => {
    expect(visualToneForId(PERFUME.id)).toBe(visualToneForId(PERFUME.id));
    expect(visualToneForId(PERFUME.id)).toBe(
      toPerfumeDetailViewModel(PERFUME).visualTone,
    );
  });

  it('maps production perfume detail fields and staged notes', () => {
    expect(toPerfumeDetailViewModel(PERFUME)).toMatchObject({
      id: PERFUME.id,
      name: PERFUME.name,
      priceLabel: 'Rp 350.000',
      notes: PERFUME.notes,
      occasions: ['night'],
    });
  });
});
