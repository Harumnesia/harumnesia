import type { RecommendationRequestInput } from '@harumnesia/recommender';

import {
  FIXTURE_PERFUMES,
  MOCK_RECOMMENDATIONS,
} from '../../fixtures/perfumes.js';
import type {
  PerfumeDetailViewModel,
  RecommendationService,
  RecommendationViewModel,
} from './types.js';
import { toPerfumeDetailViewModel } from './view-model.js';

export class MockRecommendationService implements RecommendationService {
  readonly #results: readonly RecommendationViewModel[];

  constructor(
    results: readonly RecommendationViewModel[] = MOCK_RECOMMENDATIONS,
  ) {
    this.#results = results;
  }

  async recommend(
    request: RecommendationRequestInput,
  ): Promise<RecommendationViewModel[]> {
    void request;
    await Promise.resolve();
    return this.#results.map((result) => ({
      ...result,
      keyNotes: [...result.keyNotes],
      accords: [...result.accords],
      occasions: [...result.occasions],
      reasons: [...result.reasons],
    }));
  }

  async getPerfume(id: string): Promise<PerfumeDetailViewModel | null> {
    await Promise.resolve();
    const perfume = FIXTURE_PERFUMES.find((item) => item.id === id);
    return perfume ? toPerfumeDetailViewModel(perfume) : null;
  }
}

export const mockRecommendationService = new MockRecommendationService();
