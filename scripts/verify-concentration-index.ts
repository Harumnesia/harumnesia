import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createRecommenderIndex } from '../packages/recommender/src/indexer.js';

const dataset = JSON.parse(
  readFileSync(
    new URL('../data/runtime/recommendation.enriched.json', import.meta.url),
    'utf8',
  ),
);
const taxonomy = JSON.parse(
  readFileSync(
    new URL('../data/taxonomy/concentrations.json', import.meta.url),
    'utf8',
  ),
) as {
  values: string[];
  formats: string[];
  brandDesignations: string[];
  canonicalMap: Record<string, string>;
};

const index = createRecommenderIndex(dataset);

const expectedRecords = 25_127;
const expectedCanonicalTotal = 2_113;
const expectedLocal = 779;
const expectedInternational = 1_334;

const expectedByCanonical: Record<string, number> = {
  EDC: 31,
  EDP: 1_359,
  EDT: 375,
  EXTRAIT: 82,
  PARFUM: 174,
  'PERFUME OIL': 25,
  'HAIR MIST': 11,
  ATTAR: 7,
  'BODY SPRAY': 6,
  'BODY MIST': 2,
  'DEO PARFUM': 1,
  'FRAGRANT MIST': 1,
  'PERFUMED GEL': 1,
  ELIXIR: 12,
  'ESSENCE DE PARFUM': 7,
  'LE PARFUM': 6,
  'PARFUM COLOGNE': 4,
  'PARFUM INTENSE': 3,
  'ESPRIT DE PARFUM': 3,
  'ABSOLU DE PARFUM': 1,
  'COLOGNE ABSOLUE': 1,
  'SECRET DE PARFUM': 1,
};

const unresolvedIds = [
  'international-4afc04a7465bd183',
  'international-a956142da49299b1',
  'international-100607cdff11128f',
];

const knownKeys = new Set([
  ...taxonomy.values,
  ...taxonomy.formats,
  ...taxonomy.brandDesignations,
]);

assert.equal(index.candidates.length, expectedRecords, 'total records');
assert.equal(
  index.candidates.filter(
    (candidate) => candidate.canonicalConcentration !== null,
  ).length,
  expectedCanonicalTotal,
  'records with canonical concentration',
);
assert.equal(
  index.unmappedConcentrations.length,
  0,
  'unmapped concentration labels',
);

assert.equal(
  index.candidates.filter(
    (candidate) =>
      candidate.perfume.market === 'local' &&
      candidate.canonicalConcentration !== null,
  ).length,
  expectedLocal,
  'local records with canonical concentration',
);
assert.equal(
  index.candidates.filter(
    (candidate) =>
      candidate.perfume.market === 'international' &&
      candidate.canonicalConcentration !== null,
  ).length,
  expectedInternational,
  'international records with canonical concentration',
);

const actualByCanonical = new Map<string, number>();
for (const candidate of index.candidates) {
  const canonical = candidate.canonicalConcentration;
  if (canonical === null) continue;
  assert.ok(
    knownKeys.has(canonical),
    `canonical value ${canonical} is not part of the taxonomy groups`,
  );
  actualByCanonical.set(canonical, (actualByCanonical.get(canonical) ?? 0) + 1);
}

const sortedActual = [...actualByCanonical.entries()].sort(([a], [b]) =>
  a.localeCompare(b),
);
const sortedExpected = Object.entries(expectedByCanonical).sort(([a], [b]) =>
  a.localeCompare(b),
);
assert.deepEqual(
  sortedActual,
  sortedExpected,
  'canonical concentration distribution',
);

const formatTotal = taxonomy.formats.reduce(
  (total, key) => total + (actualByCanonical.get(key) ?? 0),
  0,
);
assert.equal(formatTotal, 54, 'product format total');

const brandTotal = taxonomy.brandDesignations.reduce(
  (total, key) => total + (actualByCanonical.get(key) ?? 0),
  0,
);
assert.equal(brandTotal, 38, 'brand-specific designation total');

for (const id of unresolvedIds) {
  const candidate = index.candidates.find((entry) => entry.perfume.id === id);
  assert.ok(candidate, `unresolved product ${id} must exist`);
  assert.equal(
    candidate.perfume.concentration,
    null,
    `unresolved product ${id} must not carry a raw label`,
  );
  assert.equal(
    candidate.canonicalConcentration,
    null,
    `unresolved product ${id} must stay null`,
  );
}

console.log(
  JSON.stringify(
    {
      dataset: 'data/runtime/recommendation.enriched.json',
      records: index.candidates.length,
      canonicalTotal: expectedCanonicalTotal,
      enrichment: {
        international: expectedInternational,
        local: expectedLocal,
      },
      unmappedLabels: index.unmappedConcentrations.length,
      standardTiers: taxonomy.values,
      formats: taxonomy.formats.length,
      brandDesignations: taxonomy.brandDesignations.length,
      distribution: Object.fromEntries(sortedActual),
      unresolvedProducts: unresolvedIds,
      status: 'all assertions passed',
    },
    null,
    2,
  ),
);
