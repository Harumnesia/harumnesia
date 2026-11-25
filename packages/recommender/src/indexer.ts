import {
  RecommendationDatasetSchema,
  type RecommendationPerfume,
} from '@harumnesia/shared';

import {
  computeIdf,
  createSparseVector,
  type SparseVector,
} from './similarity.js';
import {
  getCanonicalConcentration,
  normalizeConcentrationKey,
} from './concentration.js';

export type IndexedPerfume = {
  perfume: RecommendationPerfume;
  notes: SparseVector;
  accords: SparseVector;
  /** Nilai kanonik uppercase untuk filter/scoring; null bila label tidak dikenal. */
  canonicalConcentration: string | null;
};

export type RecommenderIndex = {
  candidates: readonly IndexedPerfume[];
  notesIdf: ReadonlyMap<string, number>;
  accordsIdf: ReadonlyMap<string, number>;
  /** Label mentah yang tidak ada di canonical map — untuk audit, bukan filter. */
  unmappedConcentrations: readonly string[];
};

export function flattenNotes(perfume: RecommendationPerfume): Set<string> {
  return new Set([
    ...perfume.notes.top,
    ...perfume.notes.middle,
    ...perfume.notes.base,
  ]);
}

export function createRecommenderIndex(
  dataset: readonly RecommendationPerfume[],
): RecommenderIndex {
  const validated = RecommendationDatasetSchema.parse(dataset);
  const ids = validated.map((perfume) => perfume.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Recommendation dataset contains duplicate IDs.');
  }

  const noteSets = validated.map(flattenNotes);
  const accordSets = validated.map((perfume) => new Set(perfume.accords));
  const notesIdf = computeIdf(validated.length, noteSets);
  const accordsIdf = computeIdf(validated.length, accordSets);

  const unmapped = new Set<string>();
  const candidates = validated.map((perfume, index) => {
    const canonicalConcentration = getCanonicalConcentration(
      perfume.concentration,
    );
    if (perfume.concentration !== null && canonicalConcentration === null) {
      unmapped.add(normalizeConcentrationKey(perfume.concentration));
    }
    return {
      perfume,
      notes: createSparseVector(noteSets[index] ?? [], notesIdf),
      accords: createSparseVector(accordSets[index] ?? [], accordsIdf),
      canonicalConcentration,
    };
  });

  return {
    candidates,
    notesIdf,
    accordsIdf,
    unmappedConcentrations: [...unmapped].sort(),
  };
}
