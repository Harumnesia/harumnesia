import {
  RecommendationDatasetSchema,
  type RecommendationPerfume,
} from '@harumnesia/shared';

import {
  computeIdf,
  createSparseVector,
  type SparseVector,
} from './similarity.js';

export type IndexedPerfume = {
  perfume: RecommendationPerfume;
  notes: SparseVector;
  accords: SparseVector;
};

export type RecommenderIndex = {
  candidates: readonly IndexedPerfume[];
  notesIdf: ReadonlyMap<string, number>;
  accordsIdf: ReadonlyMap<string, number>;
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

  const candidates = validated.map((perfume, index) => ({
    perfume,
    notes: createSparseVector(noteSets[index] ?? [], notesIdf),
    accords: createSparseVector(accordSets[index] ?? [], accordsIdf),
  }));

  return { candidates, notesIdf, accordsIdf };
}
