import { readFileSync } from 'node:fs';

import type { RecommendationPerfume } from '@harumnesia/shared';
import { describe, expect, it } from 'vitest';

import { createRecommenderIndex } from '../../../packages/recommender/src/indexer.js';

type Perfume = RecommendationPerfume;

const read = (name: string): Perfume[] =>
  JSON.parse(
    readFileSync(
      new URL(`../../../data/runtime/${name}`, import.meta.url),
      'utf8',
    ),
  ) as Perfume[];

const legacy = read('recommendation.json');
const enriched = read('recommendation.enriched.json');

const ALLOWED_CHANGES = new Set(['concentration', 'accords', 'occasion']);
const EXPECTED_CHANGED: Record<string, number> = {
  concentration: 1_334,
  accords: 1_046,
  occasion: 24_063,
};
const UNRESOLVED_IDS = [
  'international-4afc04a7465bd183',
  'international-a956142da49299b1',
  'international-100607cdff11128f',
];

const serialize = (value: unknown) => JSON.stringify(value);

describe('enriched runtime dataset parity', () => {
  it('keeps the same record count and a unique, identical ID order', () => {
    expect(legacy).toHaveLength(25_127);
    expect(enriched).toHaveLength(25_127);

    const legacyIds = legacy.map(({ id }) => id);
    const enrichedIds = enriched.map(({ id }) => id);

    expect(new Set(legacyIds).size).toBe(legacyIds.length);
    expect(new Set(enrichedIds).size).toBe(enrichedIds.length);
    expect(enrichedIds).toEqual(legacyIds);
  });

  it('keeps the same key structure on every record', () => {
    legacy.forEach((record, index) => {
      const enrichedRecord = enriched[index];
      expect(enrichedRecord, `record ${index}`).toBeDefined();
      expect(
        Object.keys(enrichedRecord ?? {}).sort(),
        `record ${index}`,
      ).toEqual(Object.keys(record).sort());
    });
  });

  it('only changes concentration, accords and occasion', () => {
    const changed: Record<string, number> = {};
    const unexpected: string[] = [];

    enriched.forEach((record, index) => {
      const original = (legacy[index] ?? {}) as unknown as Record<
        string,
        unknown
      >;
      const view = record as unknown as Record<string, unknown>;
      for (const key of Object.keys(view)) {
        if (serialize(original[key]) === serialize(view[key])) continue;
        if (!ALLOWED_CHANGES.has(key)) {
          unexpected.push(`${record.id}:${key}`);
          continue;
        }
        changed[key] = (changed[key] ?? 0) + 1;
      }
    });

    expect(unexpected).toEqual([]);
    expect(changed).toEqual(EXPECTED_CHANGED);
  });

  it('keeps canonical concentration distribution and unresolved products', () => {
    const index = createRecommenderIndex(enriched);
    const byCanonical = new Map<string, number>();
    for (const candidate of index.candidates) {
      const canonical = candidate.canonicalConcentration;
      if (canonical === null) continue;
      byCanonical.set(canonical, (byCanonical.get(canonical) ?? 0) + 1);
    }

    expect(index.candidates).toHaveLength(25_127);
    expect(index.unmappedConcentrations).toEqual([]);
    expect(
      index.candidates.filter(
        ({ canonicalConcentration }) => canonicalConcentration,
      ).length,
    ).toBe(2_113);
    expect(byCanonical.get('EDP')).toBe(1_359);
    expect(byCanonical.get('EDT')).toBe(375);
    expect(byCanonical.get('PARFUM')).toBe(174);
    expect(byCanonical.get('EXTRAIT')).toBe(82);
    expect(byCanonical.get('EDC')).toBe(31);
    expect(byCanonical.get('PERFUME OIL')).toBe(25);

    for (const id of UNRESOLVED_IDS) {
      const candidate = index.candidates.find(
        ({ perfume }) => perfume.id === id,
      );
      expect(candidate, id).toBeDefined();
      expect(candidate?.perfume.concentration, id).toBeNull();
      expect(candidate?.canonicalConcentration, id).toBeNull();
    }
  });
});
