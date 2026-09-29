import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

import { RecommendationDatasetSchema } from '@harumnesia/shared';

import { createRecommender } from '../../packages/recommender/src/index.js';
import type { RecommendationRequestInput } from '../../packages/recommender/src/index.js';

const RUNTIME_DATASET_PATH = new URL(
  '../../data/runtime/recommendation.json',
  import.meta.url,
);
const EXPECTED_RECORDS = 25_127;
const REPEATED_QUERY_RUNS = 15;

function elapsed(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(2));
}

function memoryInMiB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

function quantileMedian(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

const memoryBeforeMiB = memoryInMiB();
const loadStartedAt = performance.now();
const json = await readFile(RUNTIME_DATASET_PATH, 'utf8');
const loadMs = elapsed(loadStartedAt);

const parseStartedAt = performance.now();
const dataset = RecommendationDatasetSchema.parse(JSON.parse(json));
const parseMs = elapsed(parseStartedAt);
assert.equal(dataset.length, EXPECTED_RECORDS);

const localWithPrice = dataset.find(
  (perfume) => perfume.market === 'local' && perfume.price !== null,
);
const withOccasion = dataset.find((perfume) => perfume.occasion.length > 0);
const withConcentration = dataset.find(
  (perfume) => perfume.concentration !== null,
);
const withAccord = dataset.find((perfume) => perfume.accords.length > 0);
const withNote = dataset.find(
  (perfume) =>
    perfume.notes.top.length +
      perfume.notes.middle.length +
      perfume.notes.base.length >
    0,
);
assert(
  localWithPrice && withOccasion && withConcentration && withAccord && withNote,
);

const localMaxPrice = localWithPrice.price?.amount;
const preferredConcentration = withConcentration.concentration;
assert(localMaxPrice && preferredConcentration);

const preferredNote =
  withNote.notes.top[0] ?? withNote.notes.middle[0] ?? withNote.notes.base[0];
const preferredAccord = withAccord.accords[0];
const preferredOccasion = withOccasion.occasion[0];
assert(preferredNote && preferredAccord && preferredOccasion);

const indexStartedAt = performance.now();
const recommender = createRecommender(dataset);
const indexCreationMs = elapsed(indexStartedAt);
const memoryAfterIndexMiB = memoryInMiB();

const scenarios: Array<{ name: string; request: RecommendationRequestInput }> =
  [
    {
      name: 'notes-only',
      request: { preferences: { notes: [preferredNote] } },
    },
    {
      name: 'accords-only',
      request: { preferences: { accords: [preferredAccord] } },
    },
    {
      name: 'local-max-price',
      request: {
        filters: {
          markets: ['local'],
          maxPrice: {
            amount: localMaxPrice,
            currency: 'IDR',
            unknownPolicy: 'exclude',
          },
        },
      },
    },
    {
      name: 'international-accords',
      request: {
        filters: { markets: ['international'] },
        preferences: { accords: [preferredAccord] },
      },
    },
    {
      name: 'occasion',
      request: { preferences: { occasions: [preferredOccasion] } },
    },
    {
      name: 'concentration',
      request: {
        preferences: { concentrations: [preferredConcentration] },
      },
    },
    {
      name: 'excluded-note',
      request: { filters: { excludeNotes: [preferredNote] } },
    },
    {
      name: 'mixed',
      request: {
        preferences: {
          notes: [preferredNote],
          accords: [preferredAccord],
          genders: ['unisex'],
        },
      },
    },
    { name: 'empty', request: {} },
  ];

const validIds = new Set(dataset.map((perfume) => perfume.id));
const scenarioMeasurements = scenarios.map(({ name, request }) => {
  const startedAt = performance.now();
  const first = recommender.recommend(request);
  const queryMs = elapsed(startedAt);
  const repeated = recommender.recommend(request);
  const firstIds = first.results.map((result) => result.id);

  assert.deepEqual(
    repeated.results.map((result) => result.id),
    firstIds,
  );
  assert(first.results.length <= (request.limit ?? 5));
  assert.equal(new Set(firstIds).size, firstIds.length);
  for (const result of first.results) {
    assert(validIds.has(result.id));
    assert(Number.isFinite(result.score));
    assert(Number.isFinite(result.coverage));
    assert(Number.isFinite(result.mmrScore));
    assert(result.score >= 0 && result.score <= 1);
    assert(result.coverage >= 0 && result.coverage <= 1);
  }

  return { name, queryMs, resultCount: first.results.length };
});

const rebuilt = createRecommender(dataset);
for (const { request } of scenarios) {
  assert.deepEqual(
    rebuilt.recommend(request).results.map((result) => result.id),
    recommender.recommend(request).results.map((result) => result.id),
  );
}

const representativeRequest = scenarios.find(
  (scenario) => scenario.name === 'mixed',
)?.request;
assert(representativeRequest);
const repeatedLatencies: number[] = [];
for (let run = 0; run < REPEATED_QUERY_RUNS; run += 1) {
  const startedAt = performance.now();
  recommender.recommend(representativeRequest);
  repeatedLatencies.push(performance.now() - startedAt);
}

const averageQueryMs =
  repeatedLatencies.reduce((total, duration) => total + duration, 0) /
  repeatedLatencies.length;

console.log(
  JSON.stringify(
    {
      dataset: {
        records: dataset.length,
        loadMs,
        parseAndValidateMs: parseMs,
      },
      index: {
        creationMs: indexCreationMs,
        stats: recommender.stats,
      },
      memory: {
        heapBeforeMiB: Number(memoryBeforeMiB.toFixed(2)),
        heapAfterIndexMiB: Number(memoryAfterIndexMiB.toFixed(2)),
        observedDeltaMiB: Number(
          (memoryAfterIndexMiB - memoryBeforeMiB).toFixed(2),
        ),
      },
      scenarios: scenarioMeasurements,
      repeatedMixedQuery: {
        runs: REPEATED_QUERY_RUNS,
        averageMs: Number(averageQueryMs.toFixed(2)),
        medianMs: Number(quantileMedian(repeatedLatencies).toFixed(2)),
      },
      deterministicAcrossRepeatedCalls: true,
      deterministicAcrossRebuiltIndex: true,
    },
    null,
    2,
  ),
);
