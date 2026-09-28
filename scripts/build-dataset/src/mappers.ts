import type { Perfume } from '@harumnesia/shared';

import type { CsvRecord } from './csv.js';
import { createCanonicalId } from './id.js';
import {
  collapseWhitespace,
  normalizeAccords,
  normalizeConcentration,
  normalizeDisplayText,
  normalizeGender,
  normalizeIdentityText,
  normalizeNotes,
  normalizeOccasion,
  normalizeOptionalText,
  normalizePerfumers,
  parsePrice,
  parseRating,
  parseVolume,
  parseYear,
  rawOrNull,
} from './normalize.js';

export const LOCAL_DATASET_NAME = 'Dataset_Harumnesia_clean.csv';
export const INTERNATIONAL_DATASET_NAME = 'fra_cleaned.csv';

export const LOCAL_HEADERS = [
  'No',
  'ID_Perfume',
  'perfume',
  'brand',
  'price',
  'size',
  'concentrate',
  'top notes',
  'mid notes',
  'base notes',
  'situation',
  'image',
  'gender',
] as const;

export const INTERNATIONAL_HEADERS = [
  'url',
  'Perfume',
  'Brand',
  'Country',
  'Gender',
  'Rating Value',
  'Rating Count',
  'Year',
  'Top',
  'Middle',
  'Base',
  'Perfumer1',
  'Perfumer2',
  'mainaccord1',
  'mainaccord2',
  'mainaccord3',
  'mainaccord4',
  'mainaccord5',
] as const;

function value(record: CsvRecord, key: string): string {
  const result = record[key];
  if (result === undefined) {
    throw new Error(`Missing source column: ${key}`);
  }
  return result;
}

function requiredText(record: CsvRecord, key: string): string {
  const result = collapseWhitespace(value(record, key));
  if (result === '') {
    throw new Error(`Required source value is empty: ${key}`);
  }
  return result;
}

export function mapLocalRecord(record: CsvRecord): Perfume {
  const rawName = requiredText(record, 'perfume');
  const rawBrand = requiredText(record, 'brand');
  const name = normalizeDisplayText(rawName);
  const brand = normalizeDisplayText(rawBrand);
  const rawTop = value(record, 'top notes');
  const rawMiddle = value(record, 'mid notes');
  const rawBase = value(record, 'base notes');
  const rawConcentration = value(record, 'concentrate');
  const priceAmount = parsePrice(value(record, 'price'));
  const volumeValue = parseVolume(value(record, 'size'));
  const gender = normalizeGender(value(record, 'gender'));
  const occasion = normalizeOccasion(value(record, 'situation'));
  const image = normalizeOptionalText(value(record, 'image'));
  const legacyId = requiredText(record, 'ID_Perfume');

  const identity = {
    brand: normalizeIdentityText(rawBrand),
    concentration:
      collapseWhitespace(rawConcentration).toLocaleUpperCase('en-US'),
    gender,
    image,
    name: normalizeIdentityText(rawName),
    notes: {
      base: collapseWhitespace(rawBase),
      middle: collapseWhitespace(rawMiddle),
      top: collapseWhitespace(rawTop),
    },
    occasion,
    priceAmount,
    volumeValue,
  };

  return {
    id: createCanonicalId({ market: 'local', brand, name, identity }),
    name,
    brand,
    market: 'local',
    country: null,
    gender,
    concentration: normalizeConcentration(rawConcentration),
    volume: { value: volumeValue, unit: 'ml' },
    price: { amount: priceAmount, currency: 'IDR' },
    notes: {
      top: normalizeNotes(rawTop),
      middle: normalizeNotes(rawMiddle),
      base: normalizeNotes(rawBase),
    },
    rawNotes: {
      top: rawOrNull(rawTop),
      middle: rawOrNull(rawMiddle),
      base: rawOrNull(rawBase),
    },
    accords: [],
    occasion,
    rating: null,
    year: null,
    perfumer: null,
    image,
    source: {
      dataset: LOCAL_DATASET_NAME,
      sourceType: 'local',
      legacyId,
      sourceUrl: null,
    },
  };
}

export function mapInternationalRecord(record: CsvRecord): Perfume {
  const sourceUrl = requiredText(record, 'url');
  const name = normalizeDisplayText(requiredText(record, 'Perfume'), {
    slug: true,
  });
  const brand = normalizeDisplayText(requiredText(record, 'Brand'), {
    slug: true,
  });
  const rawTop = value(record, 'Top');
  const rawMiddle = value(record, 'Middle');
  const rawBase = value(record, 'Base');

  return {
    id: createCanonicalId({
      market: 'international',
      brand,
      name,
      identity: { sourceUrl },
    }),
    name,
    brand,
    market: 'international',
    country: normalizeOptionalText(value(record, 'Country')),
    gender: normalizeGender(value(record, 'Gender')),
    concentration: { value: null, raw: null },
    volume: null,
    price: null,
    notes: {
      top: normalizeNotes(rawTop),
      middle: normalizeNotes(rawMiddle),
      base: normalizeNotes(rawBase),
    },
    rawNotes: {
      top: rawOrNull(rawTop),
      middle: rawOrNull(rawMiddle),
      base: rawOrNull(rawBase),
    },
    accords: normalizeAccords([
      value(record, 'mainaccord1'),
      value(record, 'mainaccord2'),
      value(record, 'mainaccord3'),
      value(record, 'mainaccord4'),
      value(record, 'mainaccord5'),
    ]),
    occasion: [],
    rating: parseRating(value(record, 'Rating Value')),
    year: parseYear(value(record, 'Year')),
    perfumer: normalizePerfumers([
      value(record, 'Perfumer1'),
      value(record, 'Perfumer2'),
    ]),
    image: null,
    source: {
      dataset: INTERNATIONAL_DATASET_NAME,
      sourceType: 'international',
      legacyId: null,
      sourceUrl,
    },
  };
}
