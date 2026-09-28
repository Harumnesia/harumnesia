import { describe, expect, it } from 'vitest';

import {
  normalizeConcentration,
  normalizeGender,
  normalizeNotes,
  normalizeOccasion,
  parsePrice,
  parseVolume,
} from '../src/normalize.js';

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

  it('removes only leading conjunction artifacts after comma tokenization', () => {
    expect(normalizeNotes('Cassis, Peach, & Opoponax')).toEqual([
      'cassis',
      'peach',
      'opoponax',
    ]);
    expect(normalizeNotes('Musk & Vanilla')).toEqual(['musk & vanilla']);
  });

  it('normalizes high-confidence typos observed in source data', () => {
    expect(
      normalizeNotes(
        'Blackcurant, Blackcurrent, Myyrh, Patchoulli, Cinammon, Cappucino',
      ),
    ).toEqual([
      'black currant',
      'myrrh',
      'patchouli',
      'cinnamon',
      'cappuccino',
    ]);
    expect(
      normalizeNotes('Blackcurannt, Myrhh, Patchouly, Sandalowood'),
    ).toEqual(['black currant', 'myrrh', 'patchouli', 'sandalwood']);
  });

  it('does not merge distinct semantic note variants', () => {
    expect(
      normalizeNotes(
        'Cedar, Cedarwood, Musk, White Musk, Vanilla, Madagascar Vanilla, Oud, Agarwood',
      ),
    ).toEqual([
      'cedar',
      'cedarwood',
      'musk',
      'white musk',
      'vanilla',
      'madagascar vanilla',
      'oud',
      'agarwood',
    ]);
  });

  it('removes unambiguous orphan boundary parentheses without reconstructing fragments', () => {
    expect(normalizeNotes('arbutus (madrona, bearberry tree)')).toEqual([
      'arbutus (madrona',
      'bearberry tree',
    ]);
  });
});
