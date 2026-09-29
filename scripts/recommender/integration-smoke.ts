import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import type { RecommendationPerfume } from '@harumnesia/shared';

import {
  createRecommender,
  type RecommendationRequestInput,
} from '../../packages/recommender/src/index.js';

const RUNTIME_DATASET_PATH = new URL(
  '../../data/runtime/recommendation.json',
  import.meta.url,
);
const EXPECTED_RECORDS = 25_127;

function elapsed(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(2));
}

const loadStartedAt = performance.now();
const runtimeText = await readFile(RUNTIME_DATASET_PATH, 'utf8');
const loadMs = elapsed(loadStartedAt);

const parseStartedAt = performance.now();
const dataset = JSON.parse(runtimeText) as RecommendationPerfume[];
const parseMs = elapsed(parseStartedAt);
assert.equal(dataset.length, EXPECTED_RECORDS);

const indexStartedAt = performance.now();
const recommender = createRecommender(dataset);
const indexMs = elapsed(indexStartedAt);
assert.equal(recommender.stats.perfumes, EXPECTED_RECORDS);

const requests: Array<{
  name: string;
  request: RecommendationRequestInput;
}> = [
  {
    name: 'local-bergamot-day',
    request: {
      filters: { markets: ['local'] },
      preferences: { notes: ['bergamot'], occasions: ['day'] },
      limit: 5,
    },
  },
  {
    name: 'international-woody-bergamot',
    request: {
      filters: { markets: ['international'] },
      preferences: { notes: ['bergamot'], accords: ['woody'] },
      limit: 5,
    },
  },
  {
    name: 'cross-market-amber-vanilla',
    request: {
      preferences: {
        notes: ['amber', 'vanilla'],
        genders: ['unisex'],
      },
      limit: 5,
    },
  },
];

const validIds = new Set(dataset.map(({ id }) => id));
const measurements = [];
for (const scenario of requests) {
  const firstStartedAt = performance.now();
  const first = recommender.recommend(scenario.request);
  const firstMs = elapsed(firstStartedAt);
  const repeatedStartedAt = performance.now();
  const repeated = recommender.recommend(scenario.request);
  const repeatedMs = elapsed(repeatedStartedAt);
  const ids = first.results.map(({ id }) => id);

  assert.equal(first.results.length, 5);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    repeated.results.map(({ id }) => id),
    ids,
  );
  for (const result of first.results) {
    assert(validIds.has(result.id));
    assert(Number.isFinite(result.score));
    assert(Number.isFinite(result.coverage));
    assert(Number.isFinite(result.mmrScore));
  }
  assert(first.results.some(({ reasons }) => reasons.length > 0));
  measurements.push({
    name: scenario.name,
    firstMs,
    repeatedMs,
    ids,
  });
}

const localId = measurements[0]?.ids[0];
const internationalId = measurements[1]?.ids[0];
assert(localId?.startsWith('local-'));
assert(internationalId?.startsWith('international-'));

const localLookupStartedAt = performance.now();
const localPerfume = dataset.find(({ id }) => id === localId);
const localLookupMs = elapsed(localLookupStartedAt);
const internationalLookupStartedAt = performance.now();
const internationalPerfume = dataset.find(({ id }) => id === internationalId);
const internationalLookupMs = elapsed(internationalLookupStartedAt);
assert.equal(localPerfume?.id, localId);
assert.equal(internationalPerfume?.id, internationalId);

console.log(
  JSON.stringify(
    {
      dataset: { records: dataset.length, loadMs, parseMs },
      initialization: { indexMs, stats: recommender.stats },
      requests: measurements,
      detailLookup: {
        local: { id: localId, lookupMs: localLookupMs },
        international: {
          id: internationalId,
          lookupMs: internationalLookupMs,
        },
      },
      deterministicRepeatedCalls: true,
      finiteInternalScores: true,
    },
    null,
    2,
  ),
);
