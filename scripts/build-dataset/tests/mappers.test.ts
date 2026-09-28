import { PerfumeSchema } from '@harumnesia/shared';
import { describe, expect, it } from 'vitest';

import type { CsvRecord } from '../src/csv.js';
import { mapInternationalRecord, mapLocalRecord } from '../src/mappers.js';

const localFixture: CsvRecord = {
  No: '1',
  ID_Perfume: 'HRMN-0001',
  perfume: 'glitch',
  brand: 'mykonos',
  price: '249000',
  size: '50',
  concentrate: 'XDP',
  'top notes': 'Sicilian Bergamot, Apple, Apple.',
  'mid notes': 'Lavender, Jasmine',
  'base notes': '-',
  situation: 'Day',
  image: 'https://images.example.test/glitch.jpg',
  gender: 'Unisex',
};

const internationalFixture: CsvRecord = {
  url: 'https://www.example.test/perfume/accento-74630.html',
  Perfume: '9am-accento-overdose',
  Brand: 'jean-paul-gaultier',
  Country: 'France ',
  Gender: 'women',
  'Rating Value': '4,25',
  'Rating Count': '201',
  Year: '',
  Top: 'fruity notes, aldehydes',
  Middle: 'rose, jasmine',
  Base: 'musk, woods',
  Perfumer1: 'natalie-gracia-cetto',
  Perfumer2: '',
  mainaccord1: 'Woody',
  mainaccord2: 'floral',
  mainaccord3: 'woody',
  mainaccord4: '',
  mainaccord5: '',
};

describe('source-specific mapping', () => {
  it('maps a local row and preserves nullable/asymmetric fields', () => {
    const perfume = mapLocalRecord(localFixture);

    expect(PerfumeSchema.safeParse(perfume).success).toBe(true);
    expect(perfume).toMatchObject({
      name: 'Glitch',
      brand: 'Mykonos',
      market: 'local',
      country: null,
      concentration: { value: null, raw: 'XDP' },
      volume: { value: 50, unit: 'ml' },
      price: { amount: 249_000, currency: 'IDR' },
      accords: [],
      occasion: ['day'],
      rating: null,
      year: null,
      perfumer: null,
      source: { legacyId: 'HRMN-0001', sourceUrl: null },
    });
    expect(perfume.notes.top).toEqual(['sicilian bergamot', 'apple']);
    expect(perfume.notes.base).toEqual([]);
    expect(perfume.rawNotes.base).toBe('-');
  });

  it('maps an international row without fabricating commercial metadata', () => {
    const perfume = mapInternationalRecord(internationalFixture);

    expect(PerfumeSchema.safeParse(perfume).success).toBe(true);
    expect(perfume).toMatchObject({
      name: '9am Accento Overdose',
      brand: 'Jean Paul Gaultier',
      market: 'international',
      country: 'France',
      gender: 'women',
      concentration: { value: null, raw: null },
      volume: null,
      price: null,
      accords: ['woody', 'floral'],
      occasion: [],
      rating: 4.25,
      year: null,
      perfumer: 'Natalie Gracia Cetto',
      image: null,
    });
  });
});
