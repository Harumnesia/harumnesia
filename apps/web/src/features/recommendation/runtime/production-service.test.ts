import type { RecommendationPerfume } from '@harumnesia/shared';
import type { RecommendationResult } from '@harumnesia/recommender';
import { describe, expect, it } from 'vitest';

import {
  ProductionRecommendationService,
  type RecommendationRuntimeClient,
} from './production-service.js';

const PERFUME: RecommendationPerfume = {
  id: 'international-production-id',
  name: 'Runtime Scent',
  brand: 'Worker House',
  market: 'international',
  gender: 'women',
  concentration: null,
  price: null,
  notes: { top: ['rose'], middle: [], base: ['musk'] },
  accords: ['floral'],
  occasion: [],
};

const RESULT: RecommendationResult = {
  id: PERFUME.id,
  rank: 1,
  preDiversificationRank: 1,
  score: 1,
  coverage: 1,
  mmrScore: 1,
  components: {},
  matched: {
    notes: [],
    accords: ['floral'],
    occasions: [],
    concentration: null,
    gender: 'women',
  },
  reasons: ['Matches preferred accords: floral'],
  perfume: PERFUME,
};

function runtimeClient(
  perfume: RecommendationPerfume | null,
): RecommendationRuntimeClient {
  return {
    initializationTiming: null,
    recommend: async () => ({ results: [RESULT], recommendMs: 7 }),
    getPerfume: async () => ({ perfume, lookupMs: 2 }),
  };
}

describe('ProductionRecommendationService', () => {
  it('maps worker recommendation results into frontend Top-5 models', async () => {
    const service = new ProductionRecommendationService(runtimeClient(PERFUME));
    const results = await service.recommend({ limit: 5 });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: PERFUME.id,
      rank: 1,
      name: 'Runtime Scent',
      reasons: ['Matches preferred accords: floral'],
    });
    expect(service.getDiagnostics().recommendationDurationsMs).toEqual([7]);
  });

  it('maps production detail and preserves unknown-id null', async () => {
    const found = new ProductionRecommendationService(runtimeClient(PERFUME));
    expect(await found.getPerfume(PERFUME.id)).toMatchObject({
      id: PERFUME.id,
      notes: PERFUME.notes,
    });

    const missing = new ProductionRecommendationService(runtimeClient(null));
    expect(await missing.getPerfume('missing')).toBeNull();
  });
});
