import type { Gender } from '@harumnesia/shared';

import type { RecommenderIndex, IndexedPerfume } from './indexer.js';
import type { RecommendationRequest } from './schema.js';
import {
  createSparseVector,
  idfWeightedCosine,
  type SparseVector,
} from './similarity.js';
import type {
  RecommendationComponents,
  ScoringSignal,
  ScoringWeights,
} from './types.js';

type PreferredGender = Exclude<Gender, 'unknown'>;

export type PreparedPreferences = {
  notes: SparseVector | null;
  accords: SparseVector | null;
  genders: ReadonlySet<PreferredGender> | null;
  occasions: ReadonlySet<string> | null;
  concentrations: ReadonlySet<string> | null;
  requestedWeight: number;
  ignoredNotes: string[];
  ignoredAccords: string[];
};

export type ScoredCandidate = {
  indexed: IndexedPerfume;
  score: number;
  coverage: number;
  components: RecommendationComponents;
  notesSimilarity: number;
  accordsSimilarity: number;
  matchedTerms: {
    notes: string[];
    accords: string[];
    occasions: string[];
    concentration: string | null;
    gender: PreferredGender | null;
  };
};

function requested<T>(values: readonly T[] | undefined): values is T[] {
  return values !== undefined && values.length > 0;
}

function splitKnownTerms(
  values: readonly string[] | undefined,
  vocabulary: ReadonlyMap<string, number>,
): { known: string[]; unknown: string[] } {
  const known: string[] = [];
  const unknown: string[] = [];
  for (const value of values ?? []) {
    (vocabulary.has(value) ? known : unknown).push(value);
  }
  return { known, unknown };
}

export function preparePreferences(
  preferences: RecommendationRequest['preferences'],
  index: RecommenderIndex,
  weights: ScoringWeights,
): PreparedPreferences {
  const noteTerms = splitKnownTerms(preferences?.notes, index.notesIdf);
  const accordTerms = splitKnownTerms(preferences?.accords, index.accordsIdf);
  const notes =
    noteTerms.known.length > 0 && weights.notes > 0
      ? createSparseVector(noteTerms.known, index.notesIdf)
      : null;
  const accords =
    accordTerms.known.length > 0 && weights.accords > 0
      ? createSparseVector(accordTerms.known, index.accordsIdf)
      : null;
  const genders =
    requested(preferences?.genders) && weights.gender > 0
      ? new Set(preferences.genders)
      : null;
  const occasions =
    requested(preferences?.occasions) && weights.occasion > 0
      ? new Set(preferences.occasions)
      : null;
  const concentrations =
    requested(preferences?.concentrations) && weights.concentration > 0
      ? new Set(preferences.concentrations)
      : null;

  const requestedSignals: ScoringSignal[] = [];
  if (notes) requestedSignals.push('notes');
  if (accords) requestedSignals.push('accords');
  if (genders) requestedSignals.push('gender');
  if (occasions) requestedSignals.push('occasion');
  if (concentrations) requestedSignals.push('concentration');

  return {
    notes,
    accords,
    genders,
    occasions,
    concentrations,
    requestedWeight: requestedSignals.reduce(
      (total, signal) => total + weights[signal],
      0,
    ),
    ignoredNotes: noteTerms.unknown,
    ignoredAccords: accordTerms.unknown,
  };
}

function matchedTerms(
  requestedTerms: ReadonlySet<string>,
  candidateTerms: ReadonlySet<string>,
  idf: ReadonlyMap<string, number>,
): string[] {
  return [...requestedTerms]
    .filter((term) => candidateTerms.has(term))
    .sort((left, right) => {
      const weightDifference = (idf.get(right) ?? 0) - (idf.get(left) ?? 0);
      return weightDifference !== 0
        ? weightDifference
        : left.localeCompare(right);
    });
}

export function scoreCandidate(
  candidate: IndexedPerfume,
  preferences: PreparedPreferences,
  index: RecommenderIndex,
  weights: ScoringWeights,
): ScoredCandidate {
  const components: RecommendationComponents = {};
  let weightedSum = 0;
  let applicableWeight = 0;
  let notesSimilarity = 0;
  let accordsSimilarity = 0;
  let matchedNotes: string[] = [];
  let matchedAccords: string[] = [];
  let matchedGender: PreferredGender | null = null;
  let matchedConcentration: string | null = null;
  let matchedOccasions: string[] = [];

  const apply = (signal: ScoringSignal, score: number) => {
    const weight = weights[signal];
    components[signal] = { score, weight };
    weightedSum += score * weight;
    applicableWeight += weight;
  };

  if (preferences.notes && candidate.notes.norm > 0) {
    notesSimilarity = idfWeightedCosine(
      preferences.notes,
      candidate.notes,
      index.notesIdf,
    );
    matchedNotes = matchedTerms(
      preferences.notes.terms,
      candidate.notes.terms,
      index.notesIdf,
    );
    apply('notes', notesSimilarity);
  }

  if (preferences.accords && candidate.accords.norm > 0) {
    accordsSimilarity = idfWeightedCosine(
      preferences.accords,
      candidate.accords,
      index.accordsIdf,
    );
    matchedAccords = matchedTerms(
      preferences.accords.terms,
      candidate.accords.terms,
      index.accordsIdf,
    );
    apply('accords', accordsSimilarity);
  }

  if (preferences.genders) {
    const isMatch = preferences.genders.has(
      candidate.perfume.gender as PreferredGender,
    );
    if (isMatch) {
      matchedGender = candidate.perfume.gender as PreferredGender;
    }
    apply('gender', isMatch ? 1 : 0);
  }

  if (preferences.occasions && candidate.perfume.occasion.length > 0) {
    matchedOccasions = candidate.perfume.occasion
      .filter((occasion) => preferences.occasions?.has(occasion))
      .sort();
    apply('occasion', matchedOccasions.length > 0 ? 1 : 0);
  }

  if (preferences.concentrations && candidate.perfume.concentration !== null) {
    const isMatch = preferences.concentrations.has(
      candidate.perfume.concentration,
    );
    if (isMatch) {
      matchedConcentration = candidate.perfume.concentration;
    }
    apply('concentration', isMatch ? 1 : 0);
  }

  const score = applicableWeight > 0 ? weightedSum / applicableWeight : 0;
  const coverage =
    preferences.requestedWeight > 0
      ? applicableWeight / preferences.requestedWeight
      : 0;

  return {
    indexed: candidate,
    score: Math.min(1, Math.max(0, score)),
    coverage: Math.min(1, Math.max(0, coverage)),
    components,
    notesSimilarity,
    accordsSimilarity,
    matchedTerms: {
      notes: matchedNotes,
      accords: matchedAccords,
      occasions: matchedOccasions,
      concentration: matchedConcentration,
      gender: matchedGender,
    },
  };
}

export function compareScoredCandidates(
  left: ScoredCandidate,
  right: ScoredCandidate,
): number {
  return (
    right.score - left.score ||
    right.coverage - left.coverage ||
    right.notesSimilarity - left.notesSimilarity ||
    right.accordsSimilarity - left.accordsSimilarity ||
    left.indexed.perfume.id.localeCompare(right.indexed.perfume.id)
  );
}
