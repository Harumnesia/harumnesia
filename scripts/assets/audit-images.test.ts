import { readFile } from 'node:fs/promises';

import {
  PerfumeDatasetSchema,
  RecommendationDatasetSchema,
} from '@harumnesia/shared';
import { describe, expect, it } from 'vitest';

import { buildImageAuditReport } from './audit-images.js';

describe('image reference audit', () => {
  it('matches the canonical dataset and committed report', async () => {
    const [canonicalText, runtimeText, reportText] = await Promise.all([
      readFile('data/perfumes.json', 'utf8'),
      readFile('data/runtime/recommendation.json', 'utf8'),
      readFile('scripts/assets/image-audit-report.json', 'utf8'),
    ]);
    const actual = buildImageAuditReport(
      PerfumeDatasetSchema.parse(JSON.parse(canonicalText) as unknown),
      RecommendationDatasetSchema.parse(JSON.parse(runtimeText) as unknown),
    );
    expect(actual).toEqual(JSON.parse(reportText) as unknown);
    expect(actual.totals).toEqual({
      records: 25_127,
      withImage: 1_064,
      withoutImage: 24_063,
    });
  });
});
