import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { RecommendationPerfume } from '@harumnesia/shared';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CONCENTRATION_CANONICAL_MAP,
  getCanonicalConcentration,
  normalizeConcentrationKey,
} from '../src/concentration.js';
import { createRecommenderIndex } from '../src/indexer.js';
import { filterCandidates } from '../src/filter.js';
import { RecommendationRequestSchema } from '../src/schema.js';

function perfume(
  id: string,
  concentration: string | null,
): RecommendationPerfume {
  return {
    id,
    name: `Perfume ${id}`,
    brand: 'Brand',
    market: 'local',
    gender: 'unisex',
    concentration,
    price: null,
    notes: { top: [], middle: [], base: [] },
    accords: [],
    occasion: [],
  };
}

const filterBy = (values: string[], unknownPolicy: 'include' | 'exclude') => {
  const parsed = RecommendationRequestSchema.parse({
    filters: { concentrations: { values, unknownPolicy } },
  });
  const index = createRecommenderIndex([
    perfume('edp', 'Eau de Parfum'),
    perfume('extrait', 'Extrait de Parfum'),
    perfume('edt', 'Eau de Toilette'),
    perfume('oil', 'Perfume Oil'),
    perfume('unknown-label', 'Some Obscure Line'),
    perfume('empty', null),
  ]);
  return filterCandidates(index.candidates, parsed.filters).map(
    (candidate) => candidate.perfume.id,
  );
};

describe('concentration canonicalization', () => {
  it('maps every audited label form to a canonical value', () => {
    const cases: Array<[string, string]> = [
      ['Eau de Parfum', 'EDP'],
      ['EDP', 'EDP'],
      ['Eau de Toilette', 'EDT'],
      ['Parfum', 'PARFUM'],
      ['Extrait de Parfum', 'EXTRAIT'],
      ['Eau de Cologne', 'EDC'],
      ['Perfume Oil', 'PERFUME OIL'],
      ['Attar', 'ATTAR'],
      ['Hair Mist', 'HAIR MIST'],
      ['Body Mist', 'BODY MIST'],
      ['Esprit de Parfum', 'ESPRIT DE PARFUM'],
      ['Parfum Cologne', 'PARFUM COLOGNE'],
    ];
    for (const [raw, expected] of cases) {
      expect(getCanonicalConcentration(raw), raw).toBe(expected);
    }
  });

  it('returns null for null, empty and unmapped labels', () => {
    expect(getCanonicalConcentration(null)).toBeNull();
    expect(getCanonicalConcentration(undefined)).toBeNull();
    expect(getCanonicalConcentration('   ')).toBeNull();
    expect(getCanonicalConcentration('Some Obscure Line')).toBeNull();
  });

  it('normalizes NFKC, casing and repeated whitespace', () => {
    expect(getCanonicalConcentration('  eau   de   parfum ')).toBe('EDP');
    expect(getCanonicalConcentration('ＥＤＰ')).toBe('EDP');
    expect(normalizeConcentrationKey(' Extrait  de Parfum ')).toBe(
      'EXTRAIT DE PARFUM',
    );
  });

  it('matches the taxonomy canonical map (single source of truth)', () => {
    const taxonomyPath = fileURLToPath(
      new URL('../../../data/taxonomy/concentrations.json', import.meta.url),
    );
    const taxonomy = JSON.parse(readFileSync(taxonomyPath, 'utf8')) as {
      canonicalMap: Record<string, string>;
    };
    expect({ ...DEFAULT_CONCENTRATION_CANONICAL_MAP }).toEqual(
      taxonomy.canonicalMap,
    );
  });

  it('round-trips every canonical value through the filter', () => {
    const canonicals = [...new Set(Object.values(DEFAULT_CONCENTRATION_CANONICAL_MAP))]
      .filter((code) => code !== 'NONSTANDARD')
      .sort();
    const dataset = canonicals.map((code, index) => perfume(`p${index}`, code));
    const index = createRecommenderIndex(dataset);

    for (const [position, code] of canonicals.entries()) {
      const parsed = RecommendationRequestSchema.parse({
        filters: { concentrations: { values: [code], unknownPolicy: 'exclude' } },
      });
      const ids = filterCandidates(index.candidates, parsed.filters).map(
        (candidate) => candidate.perfume.id,
      );
      expect(ids, code).toEqual([`p${position}`]);
    }
  });
});

describe('concentration filtering', () => {
  it('supports combining multiple concentration values', () => {
    expect(filterBy(['EDP', 'EXTRAIT'], 'exclude')).toEqual(['edp', 'extrait']);
  });

  it('never treats null or unmapped labels as a valid category', () => {
    expect(filterBy(['EDP'], 'exclude')).toEqual(['edp']);
    const ids = filterBy(['EDP'], 'include');
    expect(ids).toContain('empty');
    expect(ids).toContain('unknown-label');
  });

  it('reports unmapped labels for audit instead of accepting them', () => {
    const index = createRecommenderIndex([
      perfume('a', 'Parfum'),
      perfume('b', 'Mystery Grade'),
      perfume('c', null),
    ]);
    expect(index.unmappedConcentrations).toEqual(['MYSTERY GRADE']);
    expect(
      index.candidates.find((candidate) => candidate.perfume.id === 'a')
        ?.canonicalConcentration,
    ).toBe('PARFUM');
    expect(
      index.candidates.find((candidate) => candidate.perfume.id === 'c')
        ?.canonicalConcentration,
    ).toBeNull();
  });
});
