import type { RecommendationPerfume } from '@harumnesia/shared';

import type {
  FragranceVisualTone,
  RecommendationViewModel,
} from '../features/recommendation/types.js';

export const FIXTURE_PERFUMES: RecommendationPerfume[] = [
  {
    id: 'fixture-senja-ubud',
    name: 'Senja di Ubud',
    brand: 'Ruang Aroma',
    market: 'local',
    gender: 'unisex',
    concentration: 'EDP',
    price: { amount: 389_000, currency: 'IDR' },
    notes: {
      top: ['bergamot', 'citrus'],
      middle: ['jasmine'],
      base: ['sandalwood', 'amber'],
    },
    accords: [],
    occasion: ['night', 'versatile'],
  },
  {
    id: 'fixture-hujan-pagi',
    name: 'Hujan Pagi',
    brand: 'Sillage Studio',
    market: 'local',
    gender: 'unisex',
    concentration: 'EDT',
    price: { amount: 275_000, currency: 'IDR' },
    notes: {
      top: ['bergamot', 'citrus'],
      middle: ['rose'],
      base: ['musk', 'cedarwood'],
    },
    accords: [],
    occasion: ['day', 'versatile'],
  },
  {
    id: 'fixture-kembang-putih',
    name: 'Kembang Putih',
    brand: 'Nusa Parfums',
    market: 'local',
    gender: 'women',
    concentration: 'EDP',
    price: { amount: 425_000, currency: 'IDR' },
    notes: {
      top: ['bergamot'],
      middle: ['jasmine', 'rose'],
      base: ['vanilla', 'musk'],
    },
    accords: [],
    occasion: ['night'],
  },
  {
    id: 'fixture-kayu-laut',
    name: 'Kayu Laut',
    brand: 'Atelier Pesisir',
    market: 'local',
    gender: 'men',
    concentration: null,
    price: { amount: 320_000, currency: 'IDR' },
    notes: {
      top: ['citrus'],
      middle: ['patchouli'],
      base: ['cedarwood', 'sandalwood'],
    },
    accords: [],
    occasion: ['day'],
  },
  {
    id: 'fixture-vanilla-archive',
    name: 'Vanilla Archive',
    brand: 'Maison Aster',
    market: 'international',
    gender: 'women',
    concentration: null,
    price: null,
    notes: {
      top: ['bergamot'],
      middle: ['jasmine'],
      base: ['vanilla', 'amber'],
    },
    accords: ['sweet', 'amber', 'powdery'],
    occasion: [],
  },
  {
    id: 'fixture-cedar-atlas',
    name: 'Cedar Atlas',
    brand: 'Maison Aster',
    market: 'international',
    gender: 'men',
    concentration: null,
    price: null,
    notes: {
      top: ['bergamot'],
      middle: ['patchouli'],
      base: ['cedarwood', 'musk'],
    },
    accords: ['woody', 'fresh', 'spicy'],
    occasion: [],
  },
  {
    id: 'fixture-iris-paper',
    name: 'Iris on Paper',
    brand: 'Forme No. 7',
    market: 'international',
    gender: 'unisex',
    concentration: null,
    price: null,
    notes: {
      top: ['citrus'],
      middle: ['rose'],
      base: ['musk', 'vanilla'],
    },
    accords: ['powdery', 'floral', 'musky'],
    occasion: [],
  },
  {
    id: 'fixture-amber-line',
    name: 'Amber Line',
    brand: 'North Common',
    market: 'international',
    gender: 'unisex',
    concentration: null,
    price: null,
    notes: {
      top: ['bergamot'],
      middle: ['rose'],
      base: ['amber', 'sandalwood'],
    },
    accords: ['amber', 'woody', 'sweet'],
    occasion: [],
  },
  {
    id: 'fixture-citrus-study',
    name: 'Citrus Study',
    brand: 'Field Notes',
    market: 'international',
    gender: 'unisex',
    concentration: null,
    price: null,
    notes: {
      top: ['citrus', 'bergamot'],
      middle: ['jasmine'],
      base: ['musk'],
    },
    accords: ['citrus', 'fresh', 'floral'],
    occasion: [],
  },
  {
    id: 'fixture-rose-after-dark',
    name: 'Rose After Dark',
    brand: 'Nocturne',
    market: 'international',
    gender: 'women',
    concentration: null,
    price: null,
    notes: {
      top: ['bergamot'],
      middle: ['rose', 'jasmine'],
      base: ['patchouli', 'amber'],
    },
    accords: ['floral', 'spicy', 'amber'],
    occasion: [],
  },
];

const VISUAL_TONES: Record<string, FragranceVisualTone> = {
  'fixture-senja-ubud': 'amber',
  'fixture-hujan-pagi': 'citrus',
  'fixture-kembang-putih': 'rose',
  'fixture-kayu-laut': 'forest',
  'fixture-vanilla-archive': 'iris',
  'fixture-cedar-atlas': 'forest',
  'fixture-iris-paper': 'iris',
  'fixture-amber-line': 'amber',
  'fixture-citrus-study': 'citrus',
  'fixture-rose-after-dark': 'rose',
};

function formatPrice(perfume: RecommendationPerfume): string | null {
  if (!perfume.price) return null;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: perfume.price.currency,
    maximumFractionDigits: 0,
  }).format(perfume.price.amount);
}

function label(value: string): string {
  return value.charAt(0).toLocaleUpperCase('en-US') + value.slice(1);
}

export function toRecommendationViewModel(
  perfume: RecommendationPerfume,
  rank: number,
  reasons: readonly string[],
): RecommendationViewModel {
  return {
    id: perfume.id,
    rank,
    name: perfume.name,
    brand: perfume.brand,
    marketLabel: label(perfume.market),
    genderLabel: label(perfume.gender),
    concentration: perfume.concentration,
    priceLabel: formatPrice(perfume),
    keyNotes: [
      ...new Set([
        ...perfume.notes.top,
        ...perfume.notes.middle,
        ...perfume.notes.base,
      ]),
    ].slice(0, 5),
    accords: [...perfume.accords],
    occasions: [...perfume.occasion],
    reasons: [...reasons],
    visualTone: VISUAL_TONES[perfume.id] ?? 'iris',
  };
}

const RESULT_REASONS: Record<string, string[]> = {
  'fixture-senja-ubud': [
    'Matches preferred notes: bergamot, amber',
    'Matches night occasion',
    'Matches unisex gender preference',
  ],
  'fixture-vanilla-archive': [
    'Matches preferred notes: vanilla, jasmine',
    'Matches preferred accords: sweet, amber',
    'Matches women gender preference',
  ],
  'fixture-cedar-atlas': [
    'Matches preferred notes: cedarwood, bergamot',
    'Matches preferred accords: woody, fresh',
  ],
  'fixture-kembang-putih': [
    'Matches preferred notes: jasmine, rose',
    'Matches night occasion',
    'Matches EDP concentration',
  ],
  'fixture-iris-paper': [
    'Matches preferred notes: rose, musk',
    'Matches preferred accords: powdery, floral',
  ],
};

const RESULT_IDS = [
  'fixture-senja-ubud',
  'fixture-vanilla-archive',
  'fixture-cedar-atlas',
  'fixture-kembang-putih',
  'fixture-iris-paper',
];

export const MOCK_RECOMMENDATIONS: RecommendationViewModel[] = RESULT_IDS.map(
  (id, index) => {
    const perfume = FIXTURE_PERFUMES.find((item) => item.id === id);
    if (!perfume) throw new Error(`Missing mock perfume: ${id}`);
    return toRecommendationViewModel(
      perfume,
      index + 1,
      RESULT_REASONS[id] ?? [],
    );
  },
);

export function findFixturePerfume(
  id: string | undefined,
): RecommendationPerfume | undefined {
  return FIXTURE_PERFUMES.find((perfume) => perfume.id === id);
}
