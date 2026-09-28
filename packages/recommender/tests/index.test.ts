import { describe, expect, it } from 'vitest';

import { RECOMMENDER_PACKAGE_STATUS } from '../src/index';

describe('@harumnesia/recommender bootstrap', () => {
  it('exposes a ready package entry point', () => {
    expect(RECOMMENDER_PACKAGE_STATUS).toBe('ready');
  });
});
