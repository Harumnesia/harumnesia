import { describe, expect, it } from 'vitest';

import { createCanonicalId } from '../src/id.js';
import {
  normalizeConcentration,
  normalizeGender,
  normalizeNotes,
  normalizeOccasion,
  parsePrice,
  parseVolume,
} from '../src/normalize.js';

describe('canonical ID generation', () => {
  it('is deterministic and distinguishes stable source identities', () => {
    const input = {
      market: 'international' as const,
      brand: 'Maison Test',
      name: 'Example 9am',
      identity: { sourceUrl: 'https://example.test/perfume/1' },
    };

    expect(createCanonicalId(input)).toBe(createCanonicalId(input));
    expect(createCanonicalId(input)).not.toBe(
      createCanonicalId({
        ...input,
        identity: { sourceUrl: 'https://example.test/perfume/2' },
      }),
    );
  });
});

describe('categorical normalization', () => {
  it.each([
    ['Male', 'men'],
    ['FEMALE', 'women'],
    ['unisex', 'unisex'],
    ['unsupported', 'unknown'],
  ])('maps gender %s to %s', (source, expected) => {
    expect(normalizeGender(source)).toBe(expected);
  });

  it('normalizes known concentration and preserves unresolved XDP', () => {
    expect(normalizeConcentration(' edp ')).toEqual({
      value: 'EDP',
      raw: ' edp ',
    });
    expect(normalizeConcentration('XDP')).toEqual({ value: null, raw: 'XDP' });
  });

  it('normalizes only supported occasion values', () => {
    expect(normalizeOccasion('Day')).toEqual(['day']);
    expect(normalizeOccasion('Night')).toEqual(['night']);
    expect(normalizeOccasion('Versatile')).toEqual(['versatile']);
    expect(() => normalizeOccasion('Office')).toThrow('Unsupported occasion');
  });
});

describe('numeric normalization', () => {
  it('parses local price without currency conversion', () => {
    expect(parsePrice('249.000')).toBe(249_000);
    expect(() => parsePrice('-1')).toThrow();
  });

  it('parses positive volume and rejects zero', () => {
    expect(parseVolume('50')).toBe(50);
    expect(() => parseVolume('0')).toThrow();
  });
});

describe('note tokenization', () => {
  it('normalizes punctuation and safe aliases while preserving order', () => {
    expect(
      normalizeNotes(
        ' Lily-of-the-valley, Cedar Wood., lily of the valley, White Musk ',
      ),
    ).toEqual(['lily of the valley', 'cedarwood', 'white musk']);
  });

  it('removes placeholders and empty tokens', () => {
    expect(normalizeNotes(' -, , Vanilla; ')).toEqual(['vanilla']);
  });
});
