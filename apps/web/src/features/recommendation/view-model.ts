import type { RecommendationPerfume } from '@harumnesia/shared';
import type { RecommendationResult } from '@harumnesia/recommender';

import type {
  FragranceVisualTone,
  PerfumeDetailViewModel,
  RecommendationViewModel,
} from './types.js';

const VISUAL_TONES: readonly FragranceVisualTone[] = [
  'amber',
  'rose',
  'forest',
  'citrus',
  'iris',
];

export function visualToneForId(id: string): FragranceVisualTone {
  let hash = 2_166_136_261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return VISUAL_TONES[(hash >>> 0) % VISUAL_TONES.length] ?? 'iris';
}

function formatPrice(perfume: RecommendationPerfume): string | null {
  if (!perfume.price) return null;
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: perfume.price.currency,
      maximumFractionDigits: 0,
    }).format(perfume.price.amount);
  } catch {
    return `${perfume.price.currency} ${new Intl.NumberFormat('id-ID').format(
      perfume.price.amount,
    )}`;
  }
}

function label(value: string): string {
  return value.charAt(0).toLocaleUpperCase('en-US') + value.slice(1);
}

function toDisplayFields(perfume: RecommendationPerfume) {
  return {
    id: perfume.id,
    name: perfume.name,
    brand: perfume.brand,
    marketLabel: label(perfume.market),
    genderLabel: label(perfume.gender),
    concentration: perfume.concentration,
    priceLabel: formatPrice(perfume),
    visualTone: visualToneForId(perfume.id),
  };
}

export function toRecommendationPreviewViewModel(
  perfume: RecommendationPerfume,
  rank: number,
  reasons: readonly string[],
): RecommendationViewModel {
  return {
    ...toDisplayFields(perfume),
    rank,
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
  };
}

export function toRecommendationViewModel(
  result: RecommendationResult,
): RecommendationViewModel {
  return toRecommendationPreviewViewModel(
    result.perfume,
    result.rank,
    result.reasons,
  );
}

export function toPerfumeDetailViewModel(
  perfume: RecommendationPerfume,
): PerfumeDetailViewModel {
  return {
    ...toDisplayFields(perfume),
    notes: {
      top: [...perfume.notes.top],
      middle: [...perfume.notes.middle],
      base: [...perfume.notes.base],
    },
    accords: [...perfume.accords],
    occasions: [...perfume.occasion],
  };
}
