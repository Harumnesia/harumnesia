import { describe, expect, it } from 'vitest';

import type { CsvRecord } from '../src/csv.js';
import { mapInternationalRecord, mapLocalRecord } from '../src/mappers.js';

const localSource: CsvRecord = {
  No: '1',
  ID_Perfume: 'HRMN-0001',
  perfume: 'Example',
  brand: 'Brand',
  price: '100000',
  size: '50',
  concentrate: 'EDP',
  'top notes': 'Bergamot',
  'mid notes': 'Rose',
  'base notes': 'Musk',
  situation: 'Day',
  image: 'https://example.test/one.jpg',
  gender: 'Unisex',
};

const internationalSource: CsvRecord = {
  url: 'https://www.example.test/perfume/record-1.html',
  Perfume: 'original-name',
  Brand: 'original-brand',
  Country: 'France',
  Gender: 'women',
  'Rating Value': '4,25',
  'Rating Count': '10',
  Year: '2020',
  Top: 'bergamot',
  Middle: 'rose',
  Base: 'musk',
  Perfumer1: '',
  Perfumer2: '',
  mainaccord1: 'floral',
  mainaccord2: '',
  mainaccord3: '',
  mainaccord4: '',
  mainaccord5: '',
};

describe('entity-stable canonical IDs', () => {
  it('uses only the normalized local legacy ID', () => {
    const original = mapLocalRecord(localSource);
    expect(original.id).toBe('local-hrmn-0001');
    expect(mapLocalRecord({ ...localSource, price: '999000' }).id).toBe(
      original.id,
    );
    expect(
      mapLocalRecord({ ...localSource, 'top notes': 'Lemon, Apple' }).id,
    ).toBe(original.id);
    expect(
      mapLocalRecord({
        ...localSource,
        image: 'https://example.test/changed.jpg',
      }).id,
    ).toBe(original.id);
    expect(
      mapLocalRecord({ ...localSource, ID_Perfume: 'HRMN-0002' }).id,
    ).not.toBe(original.id);
  });

  it('uses only the normalized international source URL', () => {
    const original = mapInternationalRecord(internationalSource);
    expect(original.id).toMatch(/^international-[a-f0-9]{16}$/u);
    expect(
      mapInternationalRecord({
        ...internationalSource,
        Perfume: 'changed-name',
      }).id,
    ).toBe(original.id);
    expect(
      mapInternationalRecord({ ...internationalSource, Brand: 'changed-brand' })
        .id,
    ).toBe(original.id);
    expect(
      mapInternationalRecord({
        ...internationalSource,
        url: 'https://www.example.test/perfume/record-2.html',
      }).id,
    ).not.toBe(original.id);
  });
});
