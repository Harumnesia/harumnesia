import type { RecommendationRequestInput } from '@harumnesia/recommender';

import { MOCK_RECOMMENDATIONS } from '../../fixtures/perfumes.js';
import type {
  RecommendationService,
  RecommendationViewModel,
} from './types.js';

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
}

export const mockRecommendationService = new MockRecommendationService();
