import type { Gender } from '@harumnesia/shared';

const EMPTY_VALUES = new Set([
  '',
  '-',
  'unknown',
  'nan',
  'none',
  'null',
  'n/a',
  'na',
  '?',
]);
const ZERO_WIDTH_CHARACTERS = /[\u200b-\u200d\ufeff]/gu;

export const NOTE_ALIASES = {
  blackcurant: 'black currant',
  blackcurannt: 'black currant',
  blackcurrent: 'black currant',
  blackcurrant: 'black currant',
  cappucino: 'cappuccino',
  'cedar wood': 'cedarwood',
  cinammon: 'cinnamon',
  drywoods: 'dry woods',
  guaiacwood: 'guaiac wood',
  'lily-of-the-valley': 'lily of the valley',
  myrhh: 'myrrh',
  myyrh: 'myrrh',
  'oak moss': 'oakmoss',
  patchoulli: 'patchouli',
  patchouly: 'patchouli',
  'sandal wood': 'sandalwood',
  sandalowood: 'sandalwood',
  'ylang-ylang': 'ylang ylang',
} as const;

export const GENDER_MAPPINGS = {
  female: 'women',
  male: 'men',
  men: 'men',
  unisex: 'unisex',
  women: 'women',
} as const satisfies Record<string, Gender>;

export const CONCENTRATION_MAPPINGS = {
  EDC: 'EDC',
  EDP: 'EDP',
  EDT: 'EDT',
  EXTRAIT: 'Extrait',
  'EXTRAIT DE PARFUM': 'Extrait',
  PARFUM: 'Parfum',
} as const;

export const OCCASION_MAPPINGS = {
  day: 'day',
  night: 'night',
  versatile: 'versatile',
} as const;

export function collapseWhitespace(value: string): string {
  return value
    .normalize('NFC')
    .replace(ZERO_WIDTH_CHARACTERS, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function normalizeIdentityText(value: string): string {
  return collapseWhitespace(value).toLocaleLowerCase('en-US');
}

function capitalizeFirstLetter(value: string): string {
  return value.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase('en-US'));
}

export function normalizeDisplayText(
  value: string,
  options?: { slug?: boolean },
): string {
  const expanded = options?.slug ? value.replace(/-+/gu, ' ') : value;
  const normalized = collapseWhitespace(expanded);

  return normalized
    .split(' ')
    .map((word) => {
      const hasLetters = /\p{L}/u.test(word);
      const isUppercase =
        hasLetters && word === word.toLocaleUpperCase('en-US');
      const isLowercase =
        hasLetters && word === word.toLocaleLowerCase('en-US');
      const startsWithLetter = /^\p{L}/u.test(word);
      return isUppercase || !isLowercase || !startsWithLetter
        ? word
        : capitalizeFirstLetter(word);
    })
    .join(' ');
}

export function rawOrNull(value: string): string | null {
  return value.trim() === '' ? null : value;
}

export function normalizeOptionalText(value: string): string | null {
  const normalized = collapseWhitespace(value);
  return EMPTY_VALUES.has(normalized.toLocaleLowerCase('en-US'))
    ? null
    : normalized;
}

function normalizeTerm(value: string): string | null {
  let normalized = collapseWhitespace(value)
    .replace(/^(?:&\s*)+/u, '')
    .replace(/^[,;:]+/u, '')
    .replace(/[.,;:]+$/u, '')
    .trim()
    .toLocaleLowerCase('en-US');

  const openingParentheses = (normalized.match(/\(/gu) ?? []).length;
  const closingParentheses = (normalized.match(/\)/gu) ?? []).length;
  if (closingParentheses > openingParentheses) {
    normalized = normalized.replace(/^\)+\s*/u, '').replace(/\s*\)+$/u, '');
  } else if (openingParentheses > closingParentheses) {
    normalized = normalized.replace(/^\(+\s*/u, '').replace(/\s*\(+$/u, '');
  }

  return EMPTY_VALUES.has(normalized) ? null : normalized;
}

export function normalizeNoteToken(value: string): string | null {
  const normalized = normalizeTerm(value);
  if (normalized === null) {
    return null;
  }

  return NOTE_ALIASES[normalized as keyof typeof NOTE_ALIASES] ?? normalized;
}

export function normalizeNotes(value: string): string[] {
  const seen = new Set<string>();
  const notes: string[] = [];

  for (const rawToken of value.split(',')) {
    const token = normalizeNoteToken(rawToken);
    if (token !== null && !seen.has(token)) {
      seen.add(token);
      notes.push(token);
    }
  }

  return notes;
}

export function normalizeAccords(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const accords: string[] = [];

  for (const value of values) {
    const accord = normalizeTerm(value);
    if (accord !== null && !seen.has(accord)) {
      seen.add(accord);
      accords.push(accord);
    }
  }

  return accords;
}

export function normalizeGender(value: string): Gender {
  const key = collapseWhitespace(value).toLocaleLowerCase('en-US');
  return GENDER_MAPPINGS[key as keyof typeof GENDER_MAPPINGS] ?? 'unknown';
}

export function normalizeConcentration(value: string): {
  value: string | null;
  raw: string | null;
} {
  const raw = rawOrNull(value);
  if (raw === null) {
    return { value: null, raw: null };
  }

  const key = collapseWhitespace(raw).toLocaleUpperCase('en-US');
  return {
    value:
      CONCENTRATION_MAPPINGS[key as keyof typeof CONCENTRATION_MAPPINGS] ??
      null,
    raw,
  };
}

export function normalizeOccasion(value: string): string[] {
  const normalized = normalizeOptionalText(value);
  if (normalized === null) {
    return [];
  }

  const key = normalized.toLocaleLowerCase('en-US');
  const occasion = OCCASION_MAPPINGS[key as keyof typeof OCCASION_MAPPINGS];
  if (!occasion) {
    throw new Error(`Unsupported occasion value: ${value}`);
  }

  return [occasion];
}

export function parsePrice(value: string): number {
  const normalized = value.replace(/[.,\s]/gu, '');
  if (!/^\d+$/u.test(normalized)) {
    throw new Error(`Invalid price value: ${value}`);
  }

  const amount = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error(`Price must be a positive safe integer: ${value}`);
  }
  return amount;
}

export function parseVolume(value: string): number {
  const normalized = collapseWhitespace(value);
  if (!/^\d+(?:[.,]\d+)?$/u.test(normalized)) {
    throw new Error(`Invalid volume value: ${value}`);
  }

  const volume = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error(`Volume must be positive: ${value}`);
  }
  return volume;
}

export function parseRating(value: string): number | null {
  const normalized = normalizeOptionalText(value);
  if (normalized === null) {
    return null;
  }

  const rating = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    throw new Error(`Rating must be between 0 and 5: ${value}`);
  }
  return rating;
}

export function parseYear(value: string): number | null {
  const normalized = normalizeOptionalText(value);
  if (normalized === null) {
    return null;
  }

  if (!/^\d{4}$/u.test(normalized)) {
    throw new Error(`Invalid release year: ${value}`);
  }

  const year = Number.parseInt(normalized, 10);
  if (year < 1700 || year > 2100) {
    throw new Error(`Release year is outside the supported range: ${value}`);
  }
  return year;
}

export function normalizePerfumers(values: readonly string[]): string | null {
  const perfumers: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeOptionalText(value);
    if (normalized === null) {
      continue;
    }
    const display = normalizeDisplayText(normalized, { slug: true });
    const key = normalizeIdentityText(display);
    if (!seen.has(key)) {
      seen.add(key);
      perfumers.push(display);
    }
  }

  return perfumers.length === 0 ? null : perfumers.join('; ');
}
