import { readFileSync } from 'node:fs';

import { createRecommenderIndex } from '../packages/recommender/src/indexer.js';

const dataset = JSON.parse(
  readFileSync(new URL('../data/runtime/recommendation.enriched.json', import.meta.url), 'utf8'),
);
const index = createRecommenderIndex(dataset);
const withCanonical = index.candidates.filter((c) => c.canonicalConcentration !== null).length;
console.log('candidates:', index.candidates.length, '(harus 25127)');
console.log('punya canonical concentration:', withCanonical, '(harus 1334)');
console.log('unmapped:', index.unmappedConcentrations);
