import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import type { RecommendationPerfume } from '@harumnesia/shared';

import {
  createRecommender,
  type RecommendationRequestInput,
} from '../../packages/recommender/src/index.js';
import { getCanonicalConcentration } from '../../packages/recommender/src/concentration.js';

const RUNTIME_DATASET_PATH = new URL(
  '../../data/runtime/recommendation.enriched.json',
  import.meta.url,
);
const RUNTIME_DATASET_NAME = 'recommendation.enriched.json';
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
  expectReasons?: boolean;
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
  {
    name: 'preferred-edp',
    request: { preferences: { concentrations: ['EDP'] }, limit: 5 },
  },
  {
    name: 'strict-edp',
    expectReasons: false,
    request: {
      filters: {
        concentrations: { values: ['EDP'], unknownPolicy: 'exclude' },
      },
      limit: 5,
    },
  },
  {
    name: 'preferred-extrait',
    request: { preferences: { concentrations: ['EXTRAIT'] }, limit: 5 },
  },
  {
    name: 'strict-extrait',
    expectReasons: false,
    request: {
      filters: {
        concentrations: { values: ['EXTRAIT'], unknownPolicy: 'exclude' },
      },
      limit: 5,
    },
  },
  {
    name: 'strict-edp-or-extrait',
    expectReasons: false,
    request: {
      filters: {
        concentrations: {
          values: ['EDP', 'EXTRAIT'],
          unknownPolicy: 'exclude',
        },
      },
      limit: 5,
    },
  },
  {
    name: 'preferred-perfume-oil',
    request: { preferences: { concentrations: ['PERFUME OIL'] }, limit: 5 },
  },
  {
    name: 'strict-elixir',
    expectReasons: false,
    request: {
      filters: {
        concentrations: { values: ['ELIXIR'], unknownPolicy: 'exclude' },
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
  assert(
    scenario.expectReasons === false ||
      first.results.some(({ reasons }) => reasons.length > 0),
    `${scenario.name}: reasons present`,
  );
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

// --- concentration semantics on the enriched runtime ---
const canonicalOf = (result: {
  perfume: RecommendationPerfume;
}): string | null => getCanonicalConcentration(result.perfume.concentration);

const strictEdp = recommender.recommend({
  filters: { concentrations: { values: ['EDP'], unknownPolicy: 'exclude' } },
  limit: 5,
});
assert.equal(strictEdp.diagnostics.survivingCandidates, 1_359);
for (const result of strictEdp.results) {
  assert.equal(canonicalOf(result), 'EDP', 'strict EDP only returns EDP');
}

const strictExtrait = recommender.recommend({
  filters: {
    concentrations: { values: ['EXTRAIT'], unknownPolicy: 'exclude' },
  },
  limit: 5,
});
assert.equal(strictExtrait.diagnostics.survivingCandidates, 82);
for (const result of strictExtrait.results) {
  assert.equal(
    canonicalOf(result),
    'EXTRAIT',
    'strict EXTRAIT only returns extrait',
  );
}

const strictOr = recommender.recommend({
  filters: {
    concentrations: { values: ['EDP', 'EXTRAIT'], unknownPolicy: 'exclude' },
  },
  limit: 20,
});
assert.equal(
  strictOr.diagnostics.survivingCandidates,
  strictEdp.diagnostics.survivingCandidates +
    strictExtrait.diagnostics.survivingCandidates,
  'multi-value concentration filter is a union (OR)',
);
for (const result of strictOr.results) {
  const canonical = canonicalOf(result);
  assert.ok(
    canonical === 'EDP' || canonical === 'EXTRAIT',
    'multi-value filter only returns requested tiers',
  );
}

const strictEdc = recommender.recommend({
  filters: { concentrations: { values: ['EDC'], unknownPolicy: 'exclude' } },
  limit: 5,
});
assert.equal(strictEdc.diagnostics.survivingCandidates, 31);
for (const result of strictEdc.results) {
  assert.notEqual(
    result.perfume.concentration,
    null,
    'exclude policy drops null',
  );
  assert.equal(
    canonicalOf(result),
    'EDC',
    'exclude policy keeps known tiers only',
  );
}

const strictElixir = recommender.recommend({
  filters: { concentrations: { values: ['ELIXIR'], unknownPolicy: 'exclude' } },
  limit: 5,
});
assert.equal(strictElixir.diagnostics.survivingCandidates, 12);
for (const result of strictElixir.results) {
  assert.equal(
    canonicalOf(result),
    'ELIXIR',
    'ELIXIR stays a brand designation, not a tier',
  );
}

const preferredEdp = recommender.recommend({
  preferences: { concentrations: ['EDP'] },
  limit: 3,
});
assert.equal(preferredEdp.results.length, 3);
assert.equal(
  preferredEdp.results[0]?.components.concentration?.score,
  1,
  'preferred concentration contributes a matching score',
);

const preferredOil = recommender.recommend({
  preferences: { concentrations: ['PERFUME OIL'] },
  limit: 3,
});
assert.equal(canonicalOf(preferredOil.results[0]!), 'PERFUME OIL');
assert.equal(
  preferredOil.results[0]?.components.concentration?.score,
  1,
  'preferred PERFUME OIL matches the product format value',
);

const preferredExtrait = recommender.recommend({
  preferences: { concentrations: ['EXTRAIT'] },
  limit: 3,
});
assert.equal(
  preferredExtrait.results[0]?.components.concentration?.score,
  1,
  'preferred EXTRAIT matches extrait products',
);

console.log(
  JSON.stringify(
    {
      dataset: {
        file: RUNTIME_DATASET_NAME,
        records: dataset.length,
        loadMs,
        parseMs,
      },
      initialization: { indexMs, stats: recommender.stats },
      requests: measurements,
      concentration: {
        strictEdpPool: strictEdp.diagnostics.survivingCandidates,
        strictExtraitPool: strictExtrait.diagnostics.survivingCandidates,
        strictOrPool: strictOr.diagnostics.survivingCandidates,
        strictEdcPool: strictEdc.diagnostics.survivingCandidates,
        strictElixirPool: strictElixir.diagnostics.survivingCandidates,
        preferredConcentrationScored: true,
      },
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
