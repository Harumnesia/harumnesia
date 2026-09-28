import { PerfumeSchema, type Perfume } from '@harumnesia/shared';
import { describe, expect, it } from 'vitest';

import { assertDatasetIntegrity } from '../src/integrity.js';
import { mapLocalRecord } from '../src/mappers.js';

const sourceRow = {
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
  situation: 'Night',
  image: 'https://example.test/image.jpg',
  gender: 'Male',
};

describe('canonical schema and integrity validation', () => {
  it('accepts a complete canonical record with null asymmetric metadata', () => {
    expect(PerfumeSchema.safeParse(mapLocalRecord(sourceRow)).success).toBe(
      true,
    );
  });

  it('rejects invalid negative numeric fields', () => {
    const perfume = mapLocalRecord(sourceRow);
    expect(
      PerfumeSchema.safeParse({
        ...perfume,
        price: { amount: -1, currency: 'IDR' },
      }).success,
    ).toBe(false);
    expect(
      PerfumeSchema.safeParse({ ...perfume, volume: { value: 0, unit: 'ml' } })
        .success,
    ).toBe(false);
  });

  it('rejects duplicate canonical IDs', () => {
    const perfume = mapLocalRecord(sourceRow);
    const duplicate: Perfume = {
      ...perfume,
      source: { ...perfume.source, legacyId: 'HRMN-9999' },
    };

    expect(() => assertDatasetIntegrity([perfume, duplicate])).toThrow(
      'duplicate canonical IDs',
    );
  });
});
