import { describe, expect, it } from 'vitest';

import { MOCK_RECOMMENDATIONS } from '../../fixtures/perfumes.js';
import { MockRecommendationService } from './service.js';

describe('mock recommendation service', () => {
  it('returns fixture view models through the service boundary', async () => {
    const results = await new MockRecommendationService().recommend({
      limit: 5,
    });
    expect(results).toHaveLength(5);
    expect(results[0]?.id).toBe(MOCK_RECOMMENDATIONS[0]?.id);
  });

  it('returns a fresh collection so callers cannot mutate the fixture array', async () => {
    const service = new MockRecommendationService();
    const first = await service.recommend({ limit: 5 });
    first.pop();
    expect(await service.recommend({ limit: 5 })).toHaveLength(5);
  });
});
