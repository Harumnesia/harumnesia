import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

import { RecommendationDatasetSchema } from '@harumnesia/shared';
import { format } from 'prettier';

import {
  createRecommender,
  DEFAULT_MMR_LAMBDA,
  DEFAULT_SCORING_WEIGHTS,
  type RecommendationResponse,
  type ScoringWeights,
} from '../../packages/recommender/src/index.js';
import {
  buildEvaluationCases,
  countCasesBySegment,
  type EvaluationCase,
} from './evaluation-cases.js';
import {
  createEvaluationMetricContext,
  evaluateResponses,
  type EvaluationMetrics,
  type EvaluationResponse,
  type QueryObservation,
} from './evaluation-metrics.js';

const RUNTIME_DATASET_PATH = new URL(
  '../../data/runtime/recommendation.json',
  import.meta.url,
);
const REPORT_PATH = new URL('./evaluation-report.json', import.meta.url);
const EVALUATION_VERSION = '1.0.0';
const EXPECTED_RECORDS = 25_127;
const EPSILON = 1e-9;

type ConfigurationDefinition = {
  id: string;
  label: string;
  family: 'weight' | 'lambda';
  weights: ScoringWeights;
  mmrLambda: number;
};

type TimingSummary = {
  indexCreationMs: number;
  evaluationMs: number;
  queryMeanMs: number;
  queryMedianMs: number;
  queryP95Ms: number;
};

type ConfigurationRun = {
  definition: ConfigurationDefinition;
  metrics: EvaluationMetrics;
  timings: TimingSummary;
  deterministicRepeatedCalls: boolean;
  deterministicRebuiltIndex: boolean;
};

const PHASE_4_BASELINE_WEIGHTS: ScoringWeights = {
  notes: 0.55,
  accords: 0.2,
  gender: 0.1,
  occasion: 0.1,
  concentration: 0.05,
};
const PHASE_4_BASELINE_MMR_LAMBDA = 0.85;
const SELECTED_MMR_LAMBDA = 0.8;

const WEIGHT_CONFIGURATIONS: ConfigurationDefinition[] = [
  {
    id: 'baseline',
    label: 'Baseline',
    family: 'weight',
    weights: PHASE_4_BASELINE_WEIGHTS,
    mmrLambda: PHASE_4_BASELINE_MMR_LAMBDA,
  },
  {
    id: 'notes-heavy',
    label: 'Notes Heavy',
    family: 'weight',
    weights: {
      notes: 0.65,
      accords: 0.15,
      gender: 0.08,
      occasion: 0.08,
      concentration: 0.04,
    },
    mmrLambda: PHASE_4_BASELINE_MMR_LAMBDA,
  },
  {
    id: 'balanced-content',
    label: 'Balanced Content',
    family: 'weight',
    weights: {
      notes: 0.5,
      accords: 0.25,
      gender: 0.1,
      occasion: 0.1,
      concentration: 0.05,
    },
    mmrLambda: PHASE_4_BASELINE_MMR_LAMBDA,
  },
  {
    id: 'accord-aware',
    label: 'Accord Aware',
    family: 'weight',
    weights: {
      notes: 0.45,
      accords: 0.3,
      gender: 0.1,
      occasion: 0.1,
      concentration: 0.05,
    },
    mmrLambda: PHASE_4_BASELINE_MMR_LAMBDA,
  },
  {
    id: 'metadata-aware',
    label: 'Metadata Aware',
    family: 'weight',
    weights: {
      notes: 0.5,
      accords: 0.2,
      gender: 0.1,
      occasion: 0.15,
      concentration: 0.05,
    },
    mmrLambda: PHASE_4_BASELINE_MMR_LAMBDA,
  },
];

const LAMBDA_CONFIGURATIONS: ConfigurationDefinition[] = [
  1, 0.9, 0.85, 0.8, 0.7,
].map((mmrLambda) => ({
  id: `lambda-${mmrLambda.toFixed(2)}`,
  label: `MMR lambda ${mmrLambda.toFixed(2)}`,
  family: 'lambda',
  weights: PHASE_4_BASELINE_WEIGHTS,
  mmrLambda,
}));

function round(value: number): number {
  return Number(value.toFixed(6));
}

function average(values: readonly number[]): number {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function percentile(
  values: readonly number[],
  percentileValue: number,
): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function validateResponse(
  evaluationCase: EvaluationCase,
  response: RecommendationResponse,
  validIds: ReadonlySet<string>,
): void {
  const ids = response.results.map(({ id }) => id);
  assert(response.results.length <= (evaluationCase.request.limit ?? 5));
  assert.equal(new Set(ids).size, ids.length);
  for (const result of response.results) {
    assert(validIds.has(result.id));
    assert(Number.isFinite(result.score));
    assert(Number.isFinite(result.coverage));
    assert(Number.isFinite(result.mmrScore));
    assert(result.score >= 0 && result.score <= 1);
    assert(result.coverage >= 0 && result.coverage <= 1);
  }
}

function orderedIds(response: RecommendationResponse): string[] {
  return response.results.map(({ id }) => id);
}

function runConfiguration(
  definition: ConfigurationDefinition,
  dataset: ReturnType<typeof RecommendationDatasetSchema.parse>,
  cases: readonly EvaluationCase[],
  validIds: ReadonlySet<string>,
  metricContext: ReturnType<typeof createEvaluationMetricContext>,
  verifyDeterminism: boolean,
): ConfigurationRun {
  const indexStartedAt = performance.now();
  const recommender = createRecommender(dataset, {
    weights: definition.weights,
    mmrLambda: definition.mmrLambda,
  });
  const indexCreationMs = performance.now() - indexStartedAt;
  const queryDurations: number[] = [];
  const responses: EvaluationResponse[] = [];
  const evaluationStartedAt = performance.now();

  for (const evaluationCase of cases) {
    const queryStartedAt = performance.now();
    const response = recommender.recommend(evaluationCase.request);
    queryDurations.push(performance.now() - queryStartedAt);
    validateResponse(evaluationCase, response, validIds);
    responses.push({ evaluationCase, response });
  }
  const evaluationMs = performance.now() - evaluationStartedAt;

  let deterministicRepeatedCalls = true;
  let deterministicRebuiltIndex = true;
  if (verifyDeterminism) {
    for (const { evaluationCase, response } of responses) {
      const repeated = recommender.recommend(evaluationCase.request);
      if (
        orderedIds(repeated).join('\u0000') !==
        orderedIds(response).join('\u0000')
      ) {
        deterministicRepeatedCalls = false;
        break;
      }
    }

    const rebuilt = createRecommender(dataset, {
      weights: definition.weights,
      mmrLambda: definition.mmrLambda,
    });
    for (const { evaluationCase, response } of responses) {
      const repeated = rebuilt.recommend(evaluationCase.request);
      if (
        orderedIds(repeated).join('\u0000') !==
        orderedIds(response).join('\u0000')
      ) {
        deterministicRebuiltIndex = false;
        break;
      }
    }
  }

  return {
    definition,
    metrics: evaluateResponses(responses, metricContext),
    timings: {
      indexCreationMs: round(indexCreationMs),
      evaluationMs: round(evaluationMs),
      queryMeanMs: round(average(queryDurations)),
      queryMedianMs: round(median(queryDurations)),
      queryP95Ms: round(percentile(queryDurations, 0.95)),
    },
    deterministicRepeatedCalls,
    deterministicRebuiltIndex,
  };
}

function compareScalarObservations(
  candidate: readonly QueryObservation[],
  baseline: readonly QueryObservation[],
  select: (observation: QueryObservation) => number | null,
) {
  const baselineById = new Map(
    baseline.map((observation) => [observation.id, observation]),
  );
  let wins = 0;
  let ties = 0;
  let losses = 0;
  let comparedQueries = 0;
  for (const observation of candidate) {
    const baselineObservation = baselineById.get(observation.id);
    if (!baselineObservation) continue;
    const candidateValue = select(observation);
    const baselineValue = select(baselineObservation);
    if (candidateValue === null || baselineValue === null) continue;
    comparedQueries += 1;
    const delta = candidateValue - baselineValue;
    if (delta > EPSILON) wins += 1;
    else if (delta < -EPSILON) losses += 1;
    else ties += 1;
  }
  return { comparedQueries, wins, ties, losses };
}

function meanJaccard(
  candidate: readonly QueryObservation[],
  reference: readonly QueryObservation[],
): number {
  const referenceById = new Map(
    reference.map((observation) => [observation.id, observation]),
  );
  return round(
    average(
      candidate.flatMap((observation) => {
        const other = referenceById.get(observation.id);
        if (!other) return [];
        const left = new Set(observation.resultIds);
        const right = new Set(other.resultIds);
        const intersection = [...left].filter((id) => right.has(id)).length;
        const union = new Set([...left, ...right]).size;
        return [union > 0 ? intersection / union : 1];
      }),
    ),
  );
}

function exactOrderRate(
  candidate: readonly QueryObservation[],
  reference: readonly QueryObservation[],
): number {
  const referenceById = new Map(
    reference.map((observation) => [observation.id, observation]),
  );
  const comparisons = candidate.flatMap((observation) => {
    const other = referenceById.get(observation.id);
    return other
      ? [
          observation.resultIds.join('\u0000') ===
            other.resultIds.join('\u0000'),
        ]
      : [];
  });
  return round(comparisons.filter(Boolean).length / comparisons.length);
}

function delta(candidate: number, baseline: number): number {
  return round(candidate - baseline);
}

function comparison(candidate: ConfigurationRun, baseline: ConfigurationRun) {
  const candidateAggregate = candidate.metrics.aggregate;
  const baselineAggregate = baseline.metrics.aggregate;
  return {
    aggregateDeltaVsBaseline: {
      noteQueryCoverageAt5: delta(
        candidateAggregate.requestedNotes.noteQueryCoverageAt5,
        baselineAggregate.requestedNotes.noteQueryCoverageAt5,
      ),
      accordQueryCoverageAt5: delta(
        candidateAggregate.requestedAccords.accordQueryCoverageAt5,
        baselineAggregate.requestedAccords.accordQueryCoverageAt5,
      ),
      genderMatchAmongAvailable: delta(
        candidateAggregate.categorical.gender.matchRateAmongAvailable,
        baselineAggregate.categorical.gender.matchRateAmongAvailable,
      ),
      occasionMatchAmongAvailable: delta(
        candidateAggregate.categorical.occasion.matchRateAmongAvailable,
        baselineAggregate.categorical.occasion.matchRateAmongAvailable,
      ),
      concentrationMatchAmongAvailable: delta(
        candidateAggregate.categorical.concentration.matchRateAmongAvailable,
        baselineAggregate.categorical.concentration.matchRateAmongAvailable,
      ),
      meanCoverage: delta(
        candidateAggregate.evidenceCoverage.top5.mean,
        baselineAggregate.evidenceCoverage.top5.mean,
      ),
      zeroScoreRate: delta(
        candidateAggregate.zeroEvidence.zeroScoreRate,
        baselineAggregate.zeroEvidence.zeroScoreRate,
      ),
      diversityAt5: delta(
        candidateAggregate.diversity.diversityAt5,
        baselineAggregate.diversity.diversityAt5,
      ),
      distinctBrandsAt5: delta(
        candidateAggregate.brands.meanDistinctBrandsAt5,
        baselineAggregate.brands.meanDistinctBrandsAt5,
      ),
      engineInternalTop5Score: delta(
        candidateAggregate.engineInternalScore.top5.mean,
        baselineAggregate.engineInternalScore.top5.mean,
      ),
    },
    perQueryWinTieLossVsBaseline: {
      noteQueryCoverageAt5: compareScalarObservations(
        candidate.metrics.observations,
        baseline.metrics.observations,
        (observation) => observation.noteCoverage,
      ),
      accordQueryCoverageAt5: compareScalarObservations(
        candidate.metrics.observations,
        baseline.metrics.observations,
        (observation) => observation.accordCoverage,
      ),
      categoricalMatchAmongAvailable: compareScalarObservations(
        candidate.metrics.observations,
        baseline.metrics.observations,
        (observation) => observation.categoricalMatchRate,
      ),
      evidenceCoverage: compareScalarObservations(
        candidate.metrics.observations,
        baseline.metrics.observations,
        (observation) => observation.meanCoverage,
      ),
      diversityAt5: compareScalarObservations(
        candidate.metrics.observations,
        baseline.metrics.observations,
        (observation) => observation.diversity,
      ),
    },
    resultChurnVsBaseline: {
      meanJaccardAt5: meanJaccard(
        candidate.metrics.observations,
        baseline.metrics.observations,
      ),
      exactOrderedListRate: exactOrderRate(
        candidate.metrics.observations,
        baseline.metrics.observations,
      ),
    },
  };
}

function reportableRun(run: ConfigurationRun, baseline: ConfigurationRun) {
  return {
    id: run.definition.id,
    label: run.definition.label,
    weights: run.definition.weights,
    mmrLambda: run.definition.mmrLambda,
    metrics: {
      aggregate: run.metrics.aggregate,
      bySegment: run.metrics.bySegment,
    },
    comparison: comparison(run, baseline),
  };
}

const totalStartedAt = performance.now();
const loadStartedAt = performance.now();
const runtimeJson = await readFile(RUNTIME_DATASET_PATH, 'utf8');
const datasetLoadMs = performance.now() - loadStartedAt;
const runtimeDatasetSha256 = createHash('sha256')
  .update(runtimeJson)
  .digest('hex');
const parseStartedAt = performance.now();
const dataset = RecommendationDatasetSchema.parse(JSON.parse(runtimeJson));
const datasetParseAndValidateMs = performance.now() - parseStartedAt;
assert.equal(dataset.length, EXPECTED_RECORDS);

const cases = buildEvaluationCases(dataset);
assert.equal(cases.length, 159);
const querySetSha256 = createHash('sha256')
  .update(JSON.stringify(cases))
  .digest('hex');
const validIds = new Set(dataset.map(({ id }) => id));
const metricContext = createEvaluationMetricContext(dataset);

const weightRuns: ConfigurationRun[] = [];
for (const definition of WEIGHT_CONFIGURATIONS) {
  weightRuns.push(
    runConfiguration(
      definition,
      dataset,
      cases,
      validIds,
      metricContext,
      definition.id === 'baseline',
    ),
  );
}
const baseline = weightRuns[0]!;

const lambdaRuns: ConfigurationRun[] = [];
for (const definition of LAMBDA_CONFIGURATIONS) {
  if (definition.mmrLambda === PHASE_4_BASELINE_MMR_LAMBDA) {
    lambdaRuns.push({
      ...baseline,
      definition,
    });
  } else {
    lambdaRuns.push(
      runConfiguration(
        definition,
        dataset,
        cases,
        validIds,
        metricContext,
        false,
      ),
    );
  }
}
const pureRelevance = lambdaRuns.find(
  ({ definition }) => definition.mmrLambda === 1,
)!;
const selectedLambdaRun = lambdaRuns.find(
  ({ definition }) => definition.mmrLambda === SELECTED_MMR_LAMBDA,
)!;

const explanationDifferences = baseline.metrics.observations.flatMap(
  (observation) =>
    observation.explanationOrderDifferences.map((difference) => ({
      queryId: observation.id,
      ...difference,
    })),
);

const report = {
  evaluationVersion: EVALUATION_VERSION,
  scope: 'offline-engineering-evaluation',
  dataset: {
    records: dataset.length,
    runtimeDatasetSha256,
  },
  querySet: {
    total: cases.length,
    querySetSha256,
    countsBySegment: countCasesBySegment(cases),
    deterministicSelection:
      'Frequency-stratified terms and evenly spaced anchors sorted by canonical ID.',
  },
  methodology: {
    resultLimit: 5,
    noteMetric:
      'Unique known requested notes represented by at least one Top-5 result.',
    accordMetric:
      'Unique known requested accords represented by at least one Top-5 result.',
    categoricalMetric:
      'Match rate only among results where the requested metadata is available.',
    lowCoverageThreshold: 0.5,
    diversityMetric:
      'One minus mean pairwise IDF-cosine redundancy over notes and mutually available accords.',
    selectionPolicy:
      'Side-by-side proxy metrics and per-query win/tie/loss; engine score is never treated as ground truth.',
  },
  baseline: {
    configuration: {
      weights: baseline.definition.weights,
      mmrLambda: baseline.definition.mmrLambda,
    },
    metrics: {
      aggregate: baseline.metrics.aggregate,
      bySegment: baseline.metrics.bySegment,
    },
  },
  weightExperiments: weightRuns.map((run) => reportableRun(run, baseline)),
  lambdaExperiments: lambdaRuns.map((run) => ({
    ...reportableRun(run, baseline),
    churnVsLambdaOne: {
      meanJaccardAt5: meanJaccard(
        run.metrics.observations,
        pureRelevance.metrics.observations,
      ),
      exactOrderedListRate: exactOrderRate(
        run.metrics.observations,
        pureRelevance.metrics.observations,
      ),
    },
  })),
  missingnessAnalysis: {
    crossMarketMixedCoverageByResultMarket:
      baseline.metrics.bySegment['cross-market-mixed'].evidenceCoverage
        .byMarket,
    crossMarketMixedResultDistribution:
      baseline.metrics.bySegment['cross-market-mixed']
        .unconstrainedMarketDistribution,
    localStructuredCoverage:
      baseline.metrics.bySegment['local-structured'].evidenceCoverage,
    internationalStructuredCoverage:
      baseline.metrics.bySegment['international-structured'].evidenceCoverage,
  },
  explanationOrderingAnalysis: {
    productionBehavior: 'static-signal-weight',
    alternativeInspected: 'signal-weight-times-component-score',
    inspectedResults: baseline.metrics.aggregate.resultCount,
    differingResults: explanationDifferences.length,
    differingResultRate: round(
      explanationDifferences.length / baseline.metrics.aggregate.resultCount,
    ),
    representativeExamples: explanationDifferences.slice(0, 10),
    productionChanged: false,
  },
  determinism: {
    checkedQueries: cases.length,
    repeatedCallsPassed: baseline.deterministicRepeatedCalls,
    rebuiltIndexPassed: baseline.deterministicRebuiltIndex,
  },
  selectedConfiguration: {
    weights: PHASE_4_BASELINE_WEIGHTS,
    mmrLambda: SELECTED_MMR_LAMBDA,
    productionDefaultsChanged: true,
    rationale:
      'Baseline weights were retained because every weight alternative regressed at least one major segment. Lambda 0.80 was selected over 0.85 because it improved aggregate note coverage, accord coverage, categorical matches, evidence coverage, and diversity with no per-query note, accord, or categorical losses; lambda 0.70 introduced a note-query loss and substantially greater churn.',
    comparisonVsBaseline: comparison(selectedLambdaRun, baseline),
  },
  timings: {
    nonDeterministicObservations: true,
    datasetLoadMs: round(datasetLoadMs),
    datasetParseAndValidateMs: round(datasetParseAndValidateMs),
    totalEvaluationMs: round(performance.now() - totalStartedAt),
    configurations: Object.fromEntries(
      [...weightRuns, ...lambdaRuns]
        .filter(
          (run, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.definition.weights === run.definition.weights &&
                candidate.definition.mmrLambda === run.definition.mmrLambda,
            ) === index,
        )
        .map((run) => [run.definition.id, run.timings]),
    ),
  },
  knownLimitations: [
    'No human relevance labels, user feedback, online outcomes, or satisfaction data are available.',
    'Metrics are intrinsic structural proxies and must not be interpreted as recommendation accuracy.',
    'Anchor-derived queries reuse catalog metadata and therefore measure content retrieval behavior only.',
    'Local records lack accords; international records lack price, occasion, and concentration.',
    'Brand and normalized brand-name metrics are descriptive and are not optimization targets.',
    'Timing values vary by machine and are not pass/fail thresholds.',
  ],
};

assert(report.determinism.repeatedCallsPassed);
assert(report.determinism.rebuiltIndexPassed);
assert.deepEqual(DEFAULT_SCORING_WEIGHTS, PHASE_4_BASELINE_WEIGHTS);
assert.equal(DEFAULT_MMR_LAMBDA, SELECTED_MMR_LAMBDA);

const formattedReport = await format(JSON.stringify(report), {
  parser: 'json',
});
await writeFile(REPORT_PATH, formattedReport, 'utf8');

console.log(
  JSON.stringify(
    {
      report: 'scripts/recommender/evaluation-report.json',
      datasetRecords: report.dataset.records,
      queryCount: report.querySet.total,
      queryCounts: report.querySet.countsBySegment,
      weightConfigurations: report.weightExperiments.length,
      lambdaConfigurations: report.lambdaExperiments.length,
      deterministic: report.determinism,
      baseline: report.baseline.metrics.aggregate,
      selectedConfiguration: report.selectedConfiguration,
      timings: report.timings,
    },
    null,
    2,
  ),
);
