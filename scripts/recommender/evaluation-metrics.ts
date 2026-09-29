import type { RecommendationPerfume } from '@harumnesia/shared';

import { REDUNDANCY_CHANNEL_WEIGHTS } from '../../packages/recommender/src/constants.js';
import {
  createSparseVector,
  idfWeightedCosine,
  type SparseVector,
} from '../../packages/recommender/src/similarity.js';
import type {
  RecommendationResponse,
  RecommendationResult,
  ScoringSignal,
} from '../../packages/recommender/src/types.js';
import {
  EVALUATION_SEGMENTS,
  type EvaluationCase,
  type EvaluationSegment,
} from './evaluation-cases.js';

const SIGNAL_ORDER: readonly ScoringSignal[] = [
  'notes',
  'accords',
  'gender',
  'occasion',
  'concentration',
];

export type EvaluationResponse = {
  evaluationCase: EvaluationCase;
  response: RecommendationResponse;
};

export type ScalarSummary = {
  mean: number;
  median: number;
};

export type AggregateMetrics = {
  queryCount: number;
  resultCount: number;
  requestedNotes: {
    applicableQueries: number;
    noteQueryCoverageAt5: number;
    meanPerResultOverlap: number;
  };
  requestedAccords: {
    applicableQueries: number;
    accordQueryCoverageAt5: number;
    meanPerResultOverlap: number;
  };
  categorical: Record<
    'gender' | 'occasion' | 'concentration',
    {
      requestedQueries: number;
      consideredResults: number;
      availableResults: number;
      matchedResults: number;
      availabilityRate: number;
      matchRateAmongAvailable: number;
    }
  >;
  engineInternalScore: {
    top1: ScalarSummary;
    top5: ScalarSummary;
  };
  evidenceCoverage: {
    top5: ScalarSummary;
    fractionFull: number;
    fractionLowBelowHalf: number;
    distribution: {
      zero: number;
      low: number;
      medium: number;
      high: number;
      full: number;
    };
    byMarket: {
      local: ScalarSummary & { results: number };
      international: ScalarSummary & { results: number };
    };
  };
  zeroEvidence: {
    zeroScoreRate: number;
    noReasonRate: number;
    zeroScoreAndNoReasonRate: number;
  };
  diversity: {
    meanPairwiseRedundancyAt5: number;
    diversityAt5: number;
  };
  brands: {
    meanDistinctBrandsAt5: number;
    meanLargestSameBrandShareAt5: number;
  };
  normalizedBrandNameVariants: {
    listRateWithDuplicates: number;
    resultRateInDuplicateGroups: number;
  };
  unconstrainedMarketDistribution: {
    resultCount: number;
    localRate: number;
    internationalRate: number;
  };
};

export type QueryObservation = {
  id: string;
  segment: EvaluationSegment;
  resultIds: string[];
  noteCoverage: number | null;
  accordCoverage: number | null;
  categoricalMatchRate: number | null;
  meanCoverage: number;
  diversity: number;
  explanationOrderDifferences: Array<{
    resultId: string;
    staticWeightOrder: ScoringSignal[];
    contributionOrder: ScoringSignal[];
  }>;
};

export type EvaluationMetrics = {
  aggregate: AggregateMetrics;
  bySegment: Record<EvaluationSegment, AggregateMetrics>;
  observations: QueryObservation[];
};

type CandidateVectors = {
  notes: SparseVector;
  accords: SparseVector;
};

export type EvaluationMetricContext = {
  datasetById: ReadonlyMap<string, RecommendationPerfume>;
  vectorsFor(id: string): CandidateVectors;
  similarity(leftId: string, rightId: string): number;
};

type DetailedObservation = QueryObservation & {
  results: RecommendationResult[];
  notePerResultOverlaps: number[];
  accordPerResultOverlaps: number[];
  categorical: Record<
    'gender' | 'occasion' | 'concentration',
    {
      requested: boolean;
      considered: number;
      available: number;
      matched: number;
    }
  >;
  top1Score: number | null;
  scores: number[];
  coverages: number[];
  localCoverages: number[];
  internationalCoverages: number[];
  zeroScores: number;
  noReasons: number;
  zeroScoreAndNoReason: number;
  pairwiseRedundancy: number;
  distinctBrands: number;
  largestSameBrandShare: number;
  duplicateVariantResults: number;
  hasDuplicateVariant: boolean;
  marketUnconstrained: boolean;
  localResults: number;
  internationalResults: number;
};

function flattenNotes(perfume: RecommendationPerfume): string[] {
  return [...perfume.notes.top, ...perfume.notes.middle, ...perfume.notes.base];
}

function buildIdf(
  dataset: readonly RecommendationPerfume[],
  select: (perfume: RecommendationPerfume) => readonly string[],
): Map<string, number> {
  const frequencies = new Map<string, number>();
  for (const perfume of dataset) {
    for (const term of new Set(select(perfume))) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }
  }
  return new Map(
    [...frequencies].map(([term, frequency]) => [
      term,
      Math.log((dataset.length + 1) / (frequency + 1)) + 1,
    ]),
  );
}

export function createEvaluationMetricContext(
  dataset: readonly RecommendationPerfume[],
): EvaluationMetricContext {
  const datasetById = new Map(dataset.map((perfume) => [perfume.id, perfume]));
  const notesIdf = buildIdf(dataset, flattenNotes);
  const accordsIdf = buildIdf(dataset, (perfume) => perfume.accords);
  const vectorCache = new Map<string, CandidateVectors>();

  const vectorsFor = (id: string): CandidateVectors => {
    const cached = vectorCache.get(id);
    if (cached) return cached;
    const perfume = datasetById.get(id);
    if (!perfume) throw new Error(`Unknown evaluation result ID: ${id}`);
    const vectors = {
      notes: createSparseVector(flattenNotes(perfume), notesIdf),
      accords: createSparseVector(perfume.accords, accordsIdf),
    };
    vectorCache.set(id, vectors);
    return vectors;
  };

  const similarity = (leftId: string, rightId: string): number => {
    const left = vectorsFor(leftId);
    const right = vectorsFor(rightId);
    let weightedSum = 0;
    let availableWeight = 0;
    if (left.notes.norm > 0 && right.notes.norm > 0) {
      weightedSum +=
        idfWeightedCosine(left.notes, right.notes, notesIdf) *
        REDUNDANCY_CHANNEL_WEIGHTS.notes;
      availableWeight += REDUNDANCY_CHANNEL_WEIGHTS.notes;
    }
    if (left.accords.norm > 0 && right.accords.norm > 0) {
      weightedSum +=
        idfWeightedCosine(left.accords, right.accords, accordsIdf) *
        REDUNDANCY_CHANNEL_WEIGHTS.accords;
      availableWeight += REDUNDANCY_CHANNEL_WEIGHTS.accords;
    }
    return availableWeight > 0 ? weightedSum / availableWeight : 0;
  };

  return { datasetById, vectorsFor, similarity };
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function summary(values: readonly number[]): ScalarSummary {
  return { mean: round(average(values)), median: round(median(values)) };
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? round(numerator / denominator) : 0;
}

function normalizedTerms(values: readonly string[] | undefined): Set<string> {
  return new Set(
    (values ?? []).map((value) => value.trim().toLocaleLowerCase('en-US')),
  );
}

function requestedTermCoverage(
  requested: ReadonlySet<string>,
  matched: Iterable<string>,
): number | null {
  if (requested.size === 0) return null;
  const matchedSet = new Set(matched);
  let hits = 0;
  for (const term of requested) {
    if (matchedSet.has(term)) hits += 1;
  }
  return hits / requested.size;
}

function categoricalEvidence(
  evaluationCase: EvaluationCase,
  results: readonly RecommendationResult[],
) {
  const genders = new Set(evaluationCase.request.preferences?.genders ?? []);
  const occasions = normalizedTerms(
    evaluationCase.request.preferences?.occasions,
  );
  const concentrations = new Set(
    (evaluationCase.request.preferences?.concentrations ?? []).map((value) =>
      value.trim().toLocaleUpperCase('en-US'),
    ),
  );
  const evidence = {
    gender: {
      requested: genders.size > 0,
      considered: 0,
      available: 0,
      matched: 0,
    },
    occasion: {
      requested: occasions.size > 0,
      considered: 0,
      available: 0,
      matched: 0,
    },
    concentration: {
      requested: concentrations.size > 0,
      considered: 0,
      available: 0,
      matched: 0,
    },
  };

  for (const result of results) {
    if (evidence.gender.requested) {
      evidence.gender.considered += 1;
      evidence.gender.available += 1;
      if (genders.has(result.perfume.gender as 'men' | 'women' | 'unisex')) {
        evidence.gender.matched += 1;
      }
    }
    if (evidence.occasion.requested) {
      evidence.occasion.considered += 1;
      if (result.perfume.occasion.length > 0) {
        evidence.occasion.available += 1;
        if (result.perfume.occasion.some((value) => occasions.has(value))) {
          evidence.occasion.matched += 1;
        }
      }
    }
    if (evidence.concentration.requested) {
      evidence.concentration.considered += 1;
      if (result.perfume.concentration !== null) {
        evidence.concentration.available += 1;
        if (concentrations.has(result.perfume.concentration)) {
          evidence.concentration.matched += 1;
        }
      }
    }
  }
  return evidence;
}

function meanPairwiseRedundancy(
  results: readonly RecommendationResult[],
  context: EvaluationMetricContext,
): number {
  const similarities: number[] = [];
  for (let left = 0; left < results.length; left += 1) {
    for (let right = left + 1; right < results.length; right += 1) {
      similarities.push(
        context.similarity(results[left]!.id, results[right]!.id),
      );
    }
  }
  return average(similarities);
}

function explanationOrderDifferences(results: readonly RecommendationResult[]) {
  return results.flatMap((result) => {
    const positiveSignals = SIGNAL_ORDER.filter(
      (signal) => (result.components[signal]?.score ?? 0) > 0,
    );
    const staticWeightOrder = [...positiveSignals]
      .sort(
        (left, right) =>
          (result.components[right]?.weight ?? 0) -
            (result.components[left]?.weight ?? 0) ||
          SIGNAL_ORDER.indexOf(left) - SIGNAL_ORDER.indexOf(right),
      )
      .slice(0, 3);
    const contributionOrder = [...positiveSignals]
      .sort(
        (left, right) =>
          (result.components[right]?.weight ?? 0) *
            (result.components[right]?.score ?? 0) -
            (result.components[left]?.weight ?? 0) *
              (result.components[left]?.score ?? 0) ||
          SIGNAL_ORDER.indexOf(left) - SIGNAL_ORDER.indexOf(right),
      )
      .slice(0, 3);
    return staticWeightOrder.join('|') === contributionOrder.join('|')
      ? []
      : [{ resultId: result.id, staticWeightOrder, contributionOrder }];
  });
}

function observe(
  evaluationCase: EvaluationCase,
  response: RecommendationResponse,
  context: EvaluationMetricContext,
): DetailedObservation {
  const results = response.results;
  const requestedNotes = normalizedTerms(
    evaluationCase.request.preferences?.notes,
  );
  const requestedAccords = normalizedTerms(
    evaluationCase.request.preferences?.accords,
  );
  const matchedNotes = results.flatMap((result) =>
    result.matched.notes.map(({ term }) => term),
  );
  const matchedAccords = results.flatMap((result) => result.matched.accords);
  const categorical = categoricalEvidence(evaluationCase, results);
  const categoricalAvailable = Object.values(categorical).reduce(
    (total, value) => total + value.available,
    0,
  );
  const categoricalMatched = Object.values(categorical).reduce(
    (total, value) => total + value.matched,
    0,
  );
  const brandCounts = new Map<string, number>();
  const variantCounts = new Map<string, number>();
  for (const result of results) {
    const brand = result.perfume.brand.trim().toLocaleLowerCase('en-US');
    const variant = `${brand}\u0000${result.perfume.name.trim().toLocaleLowerCase('en-US')}`;
    brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1);
    variantCounts.set(variant, (variantCounts.get(variant) ?? 0) + 1);
  }
  const duplicateKeys = new Set(
    [...variantCounts].filter(([, count]) => count > 1).map(([key]) => key),
  );
  const duplicateVariantResults = results.filter((result) => {
    const brand = result.perfume.brand.trim().toLocaleLowerCase('en-US');
    const key = `${brand}\u0000${result.perfume.name.trim().toLocaleLowerCase('en-US')}`;
    return duplicateKeys.has(key);
  }).length;
  const pairwiseRedundancy = meanPairwiseRedundancy(results, context);
  const coverages = results.map((result) => result.coverage);

  return {
    id: evaluationCase.id,
    segment: evaluationCase.segment,
    resultIds: results.map((result) => result.id),
    noteCoverage: requestedTermCoverage(requestedNotes, matchedNotes),
    accordCoverage: requestedTermCoverage(requestedAccords, matchedAccords),
    categoricalMatchRate:
      categoricalAvailable > 0
        ? categoricalMatched / categoricalAvailable
        : null,
    meanCoverage: average(coverages),
    diversity: 1 - pairwiseRedundancy,
    explanationOrderDifferences: explanationOrderDifferences(results),
    results: [...results],
    notePerResultOverlaps:
      requestedNotes.size > 0
        ? results.map(
            (result) =>
              result.matched.notes.filter(({ term }) =>
                requestedNotes.has(term),
              ).length / requestedNotes.size,
          )
        : [],
    accordPerResultOverlaps:
      requestedAccords.size > 0
        ? results.map(
            (result) =>
              result.matched.accords.filter((term) =>
                requestedAccords.has(term),
              ).length / requestedAccords.size,
          )
        : [],
    categorical,
    top1Score: results[0]?.score ?? null,
    scores: results.map((result) => result.score),
    coverages,
    localCoverages: results
      .filter((result) => result.perfume.market === 'local')
      .map((result) => result.coverage),
    internationalCoverages: results
      .filter((result) => result.perfume.market === 'international')
      .map((result) => result.coverage),
    zeroScores: results.filter((result) => result.score === 0).length,
    noReasons: results.filter((result) => result.reasons.length === 0).length,
    zeroScoreAndNoReason: results.filter(
      (result) => result.score === 0 && result.reasons.length === 0,
    ).length,
    pairwiseRedundancy,
    distinctBrands: brandCounts.size,
    largestSameBrandShare:
      results.length > 0
        ? Math.max(0, ...brandCounts.values()) / results.length
        : 0,
    duplicateVariantResults,
    hasDuplicateVariant: duplicateKeys.size > 0,
    marketUnconstrained:
      (evaluationCase.request.filters?.markets?.length ?? 0) === 0,
    localResults: results.filter((result) => result.perfume.market === 'local')
      .length,
    internationalResults: results.filter(
      (result) => result.perfume.market === 'international',
    ).length,
  };
}

function aggregate(
  observations: readonly DetailedObservation[],
): AggregateMetrics {
  const results = observations.flatMap((observation) => observation.results);
  const noteObservations = observations.filter(
    (observation) => observation.noteCoverage !== null,
  );
  const accordObservations = observations.filter(
    (observation) => observation.accordCoverage !== null,
  );
  const allCoverages = observations.flatMap(
    (observation) => observation.coverages,
  );
  const localCoverages = observations.flatMap(
    (observation) => observation.localCoverages,
  );
  const internationalCoverages = observations.flatMap(
    (observation) => observation.internationalCoverages,
  );
  const categorical = Object.fromEntries(
    (['gender', 'occasion', 'concentration'] as const).map((signal) => {
      const requested = observations.filter(
        (observation) => observation.categorical[signal].requested,
      );
      const considered = requested.reduce(
        (total, observation) =>
          total + observation.categorical[signal].considered,
        0,
      );
      const available = requested.reduce(
        (total, observation) =>
          total + observation.categorical[signal].available,
        0,
      );
      const matched = requested.reduce(
        (total, observation) => total + observation.categorical[signal].matched,
        0,
      );
      return [
        signal,
        {
          requestedQueries: requested.length,
          consideredResults: considered,
          availableResults: available,
          matchedResults: matched,
          availabilityRate: ratio(available, considered),
          matchRateAmongAvailable: ratio(matched, available),
        },
      ];
    }),
  ) as AggregateMetrics['categorical'];
  const unconstrained = observations.filter(
    (observation) => observation.marketUnconstrained,
  );
  const unconstrainedLocal = unconstrained.reduce(
    (total, observation) => total + observation.localResults,
    0,
  );
  const unconstrainedInternational = unconstrained.reduce(
    (total, observation) => total + observation.internationalResults,
    0,
  );
  const unconstrainedResults = unconstrainedLocal + unconstrainedInternational;
  const redundancies = observations.map(
    (observation) => observation.pairwiseRedundancy,
  );

  return {
    queryCount: observations.length,
    resultCount: results.length,
    requestedNotes: {
      applicableQueries: noteObservations.length,
      noteQueryCoverageAt5: round(
        average(
          noteObservations.map((observation) => observation.noteCoverage!),
        ),
      ),
      meanPerResultOverlap: round(
        average(
          noteObservations.flatMap(
            (observation) => observation.notePerResultOverlaps,
          ),
        ),
      ),
    },
    requestedAccords: {
      applicableQueries: accordObservations.length,
      accordQueryCoverageAt5: round(
        average(
          accordObservations.map((observation) => observation.accordCoverage!),
        ),
      ),
      meanPerResultOverlap: round(
        average(
          accordObservations.flatMap(
            (observation) => observation.accordPerResultOverlaps,
          ),
        ),
      ),
    },
    categorical,
    engineInternalScore: {
      top1: summary(
        observations.flatMap((observation) =>
          observation.top1Score === null ? [] : [observation.top1Score],
        ),
      ),
      top5: summary(observations.flatMap((observation) => observation.scores)),
    },
    evidenceCoverage: {
      top5: summary(allCoverages),
      fractionFull: ratio(
        allCoverages.filter((coverage) => Math.abs(coverage - 1) < 1e-12)
          .length,
        allCoverages.length,
      ),
      fractionLowBelowHalf: ratio(
        allCoverages.filter((coverage) => coverage < 0.5).length,
        allCoverages.length,
      ),
      distribution: {
        zero: ratio(
          allCoverages.filter((coverage) => coverage === 0).length,
          allCoverages.length,
        ),
        low: ratio(
          allCoverages.filter((coverage) => coverage > 0 && coverage < 0.5)
            .length,
          allCoverages.length,
        ),
        medium: ratio(
          allCoverages.filter((coverage) => coverage >= 0.5 && coverage < 0.75)
            .length,
          allCoverages.length,
        ),
        high: ratio(
          allCoverages.filter((coverage) => coverage >= 0.75 && coverage < 1)
            .length,
          allCoverages.length,
        ),
        full: ratio(
          allCoverages.filter((coverage) => Math.abs(coverage - 1) < 1e-12)
            .length,
          allCoverages.length,
        ),
      },
      byMarket: {
        local: { ...summary(localCoverages), results: localCoverages.length },
        international: {
          ...summary(internationalCoverages),
          results: internationalCoverages.length,
        },
      },
    },
    zeroEvidence: {
      zeroScoreRate: ratio(
        observations.reduce(
          (total, observation) => total + observation.zeroScores,
          0,
        ),
        results.length,
      ),
      noReasonRate: ratio(
        observations.reduce(
          (total, observation) => total + observation.noReasons,
          0,
        ),
        results.length,
      ),
      zeroScoreAndNoReasonRate: ratio(
        observations.reduce(
          (total, observation) => total + observation.zeroScoreAndNoReason,
          0,
        ),
        results.length,
      ),
    },
    diversity: {
      meanPairwiseRedundancyAt5: round(average(redundancies)),
      diversityAt5: round(1 - average(redundancies)),
    },
    brands: {
      meanDistinctBrandsAt5: round(
        average(observations.map((observation) => observation.distinctBrands)),
      ),
      meanLargestSameBrandShareAt5: round(
        average(
          observations.map((observation) => observation.largestSameBrandShare),
        ),
      ),
    },
    normalizedBrandNameVariants: {
      listRateWithDuplicates: ratio(
        observations.filter((observation) => observation.hasDuplicateVariant)
          .length,
        observations.length,
      ),
      resultRateInDuplicateGroups: ratio(
        observations.reduce(
          (total, observation) => total + observation.duplicateVariantResults,
          0,
        ),
        results.length,
      ),
    },
    unconstrainedMarketDistribution: {
      resultCount: unconstrainedResults,
      localRate: ratio(unconstrainedLocal, unconstrainedResults),
      internationalRate: ratio(
        unconstrainedInternational,
        unconstrainedResults,
      ),
    },
  };
}

export function evaluateResponses(
  responses: readonly EvaluationResponse[],
  context: EvaluationMetricContext,
): EvaluationMetrics {
  const detailed = responses.map(({ evaluationCase, response }) =>
    observe(evaluationCase, response, context),
  );
  const observations: QueryObservation[] = detailed.map(
    ({
      id,
      segment,
      resultIds,
      noteCoverage,
      accordCoverage,
      categoricalMatchRate,
      meanCoverage,
      diversity,
      explanationOrderDifferences: differences,
    }) => ({
      id,
      segment,
      resultIds,
      noteCoverage,
      accordCoverage,
      categoricalMatchRate,
      meanCoverage,
      diversity,
      explanationOrderDifferences: differences,
    }),
  );
  const bySegment = Object.fromEntries(
    EVALUATION_SEGMENTS.map((segment) => [
      segment,
      aggregate(
        detailed.filter((observation) => observation.segment === segment),
      ),
    ]),
  ) as Record<EvaluationSegment, AggregateMetrics>;

  return { aggregate: aggregate(detailed), bySegment, observations };
}
