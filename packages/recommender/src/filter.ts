import type { RecommendationRequest } from './schema.js';
import type { IndexedPerfume } from './indexer.js';

function hasOverlap(
  values: readonly string[],
  requested: ReadonlySet<string>,
): boolean {
  return values.some((value) => requested.has(value));
}

export function filterCandidates(
  candidates: readonly IndexedPerfume[],
  filters: RecommendationRequest['filters'],
): IndexedPerfume[] {
  if (!filters) {
    return [...candidates];
  }

  const markets = new Set(filters.markets ?? []);
  const genders = new Set(filters.genders ?? []);
  const concentrations = new Set(filters.concentrations?.values ?? []);
  const occasions = new Set(filters.occasions?.values ?? []);
  const excludedNotes = new Set(filters.excludeNotes ?? []);
  const excludedIds = new Set(filters.excludeIds ?? []);

  return candidates.filter((candidate) => {
    const { perfume } = candidate;

    if (markets.size > 0 && !markets.has(perfume.market)) {
      return false;
    }
    if (
      genders.size > 0 &&
      !genders.has(perfume.gender as 'men' | 'women' | 'unisex')
    ) {
      return false;
    }
    if (excludedIds.has(perfume.id)) {
      return false;
    }
    if (
      excludedNotes.size > 0 &&
      [...candidate.notes.terms].some((note) => excludedNotes.has(note))
    ) {
      return false;
    }

    if (filters.maxPrice) {
      const { price } = perfume;
      const comparablePrice =
        price?.currency === filters.maxPrice.currency ? price.amount : null;
      if (comparablePrice === null) {
        if (filters.maxPrice.unknownPolicy === 'exclude') {
          return false;
        }
      } else if (comparablePrice > filters.maxPrice.amount) {
        return false;
      }
    }

    if (filters.concentrations && concentrations.size > 0) {
      if (perfume.concentration === null) {
        if (filters.concentrations.unknownPolicy === 'exclude') {
          return false;
        }
      } else if (!concentrations.has(perfume.concentration)) {
        return false;
      }
    }

    if (filters.occasions && occasions.size > 0) {
      if (perfume.occasion.length === 0) {
        if (filters.occasions.unknownPolicy === 'exclude') {
          return false;
        }
      } else if (!hasOverlap(perfume.occasion, occasions)) {
        return false;
      }
    }

    return true;
  });
}
