import type { RecommendationPerfume } from '@harumnesia/shared';

import { buildMatch, buildReasons } from './explain.js';
import { filterCandidates } from './filter.js';
import { createRecommenderIndex } from './indexer.js';
import { diversifyCandidates } from './diversification.js';
import {
  RecommendationRequestSchema,
  resolveRecommenderOptions,
} from './schema.js';
import {
  compareScoredCandidates,
  preparePreferences,
  scoreCandidate,
} from './scoring.js';
import type {
  Recommender,
  RecommenderOptions,
  RecommendationResult,
} from './types.js';

function clonePerfume(perfume: RecommendationPerfume): RecommendationPerfume {
  return {
    ...perfume,
    price: perfume.price ? { ...perfume.price } : null,
    notes: {
      top: [...perfume.notes.top],
      middle: [...perfume.notes.middle],
      base: [...perfume.notes.base],
    },
    accords: [...perfume.accords],
    occasion: [...perfume.occasion],
  };
}

export function createRecommender(
  dataset: readonly RecommendationPerfume[],
  options: RecommenderOptions = {},
): Recommender {
  const index = createRecommenderIndex(dataset);
  const resolvedOptions = resolveRecommenderOptions(options);
  const stats = Object.freeze({
    perfumes: index.candidates.length,
    notesVocabulary: index.notesIdf.size,
    accordsVocabulary: index.accordsIdf.size,
  });

  return {
    stats,
    recommend(request = {}) {
      const normalizedRequest = RecommendationRequestSchema.parse(request);
      const filtered = filterCandidates(
        index.candidates,
        normalizedRequest.filters,
      );
      const prepared = preparePreferences(
        normalizedRequest.preferences,
        index,
        resolvedOptions.weights,
      );
      const scored = filtered
        .map((candidate) =>
          scoreCandidate(candidate, prepared, index, resolvedOptions.weights),
        )
        .sort(compareScoredCandidates);
      const diversified = diversifyCandidates(
        scored,
        normalizedRequest.limit,
        resolvedOptions.mmrLambda,
        index.notesIdf,
        index.accordsIdf,
      );
      const results: RecommendationResult[] = diversified.map(
        ({ candidate, preDiversificationRank, mmrScore }, resultIndex) => ({
          id: candidate.indexed.perfume.id,
          rank: resultIndex + 1,
          preDiversificationRank,
          score: candidate.score,
          coverage: candidate.coverage,
          mmrScore,
          components: candidate.components,
          matched: buildMatch(candidate),
          reasons: buildReasons(candidate),
          perfume: clonePerfume(candidate.indexed.perfume),
        }),
      );

      return {
        results,
        diagnostics: {
          totalPerfumes: index.candidates.length,
          survivingCandidates: filtered.length,
          diversificationPoolSize: Math.min(
            scored.length,
            Math.max(50, normalizedRequest.limit * 10),
          ),
          requestedWeight: prepared.requestedWeight,
          ignoredPreferences: {
            notes: [...prepared.ignoredNotes],
            accords: [...prepared.ignoredAccords],
          },
        },
      };
    },
  };
}
