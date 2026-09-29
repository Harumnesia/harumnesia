import { describe, expect, it } from 'vitest';

import { createRecommender } from '../../../packages/recommender/src/index.js';
import { fixtureDataset } from '../../../packages/recommender/tests/fixtures.js';
import {
  buildEvaluationCases,
  countCasesBySegment,
  EVALUATION_SEGMENTS,
  type EvaluationCase,
} from '../evaluation-cases.js';
import {
  createEvaluationMetricContext,
  evaluateResponses,
} from '../evaluation-metrics.js';

function expectFiniteNumbers(value: unknown): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value)).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(expectFiniteNumbers);
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(expectFiniteNumbers);
  }
}

describe('evaluation query generation', () => {
  it('is deterministic and produces unique IDs across every segment', () => {
    const first = buildEvaluationCases(fixtureDataset);
    const second = buildEvaluationCases(fixtureDataset);
    const counts = countCasesBySegment(first);

    expect(second).toEqual(first);
    expect(new Set(first.map(({ id }) => id)).size).toBe(first.length);
    expect(
      Object.values(counts).reduce((total, count) => total + count, 0),
    ).toBe(first.length);
    for (const segment of EVALUATION_SEGMENTS) {
      expect(counts[segment]).toBeGreaterThan(0);
    }
  });

  it('excludes each anchor and uses the matching market for structured cases', () => {
    const cases = buildEvaluationCases(fixtureDataset).filter(
      ({ segment }) =>
        segment === 'local-structured' ||
        segment === 'international-structured',
    );

    for (const evaluationCase of cases) {
      expect(evaluationCase.request.filters?.excludeIds).toHaveLength(1);
      expect(evaluationCase.request.filters?.markets).toEqual([
        evaluationCase.segment === 'local-structured'
          ? 'local'
          : 'international',
      ]);
    }
  });

  it('derives only known note and accord terms', () => {
    const knownNotes = new Set(
      fixtureDataset.flatMap((perfume) => [
        ...perfume.notes.top,
        ...perfume.notes.middle,
        ...perfume.notes.base,
      ]),
    );
    const knownAccords = new Set(
      fixtureDataset.flatMap((perfume) => perfume.accords),
    );

    for (const evaluationCase of buildEvaluationCases(fixtureDataset)) {
      for (const note of evaluationCase.request.preferences?.notes ?? []) {
        expect(knownNotes.has(note)).toBe(true);
      }
      for (const accord of evaluationCase.request.preferences?.accords ?? []) {
        expect(knownAccords.has(accord)).toBe(true);
      }
    }
  });
});

describe('evaluation metrics', () => {
  const evaluationCases: EvaluationCase[] = [
    {
      id: 'notes',
      segment: 'notes-only',
      source: 'control',
      request: { preferences: { notes: ['vanilla'] } },
    },
    {
      id: 'accords',
      segment: 'accords-only',
      source: 'control',
      request: { preferences: { accords: ['woody'] } },
    },
    {
      id: 'mixed',
      segment: 'cross-market-mixed',
      source: 'control',
      request: {
        preferences: {
          notes: ['jasmine'],
          genders: ['women'],
          occasions: ['night'],
          concentrations: ['EDP'],
        },
      },
    },
  ];

  it('reports independent hit, coverage, categorical, diversity, and market metrics', () => {
    const recommender = createRecommender(fixtureDataset);
    const context = createEvaluationMetricContext(fixtureDataset);
    const metrics = evaluateResponses(
      evaluationCases.map((evaluationCase) => ({
        evaluationCase,
        response: recommender.recommend(evaluationCase.request),
      })),
      context,
    );

    expect(metrics.aggregate.requestedNotes.applicableQueries).toBe(2);
    expect(
      metrics.aggregate.requestedNotes.noteQueryCoverageAt5,
    ).toBeGreaterThan(0);
    expect(metrics.aggregate.requestedAccords.applicableQueries).toBe(1);
    expect(
      metrics.aggregate.categorical.gender.availableResults,
    ).toBeGreaterThan(0);
    expect(
      metrics.aggregate.evidenceCoverage.byMarket.local.results,
    ).toBeGreaterThan(0);
    expect(metrics.aggregate.diversity.diversityAt5).toBeGreaterThanOrEqual(0);
    expect(
      metrics.aggregate.unconstrainedMarketDistribution.localRate +
        metrics.aggregate.unconstrainedMarketDistribution.internationalRate,
    ).toBeCloseTo(1);
  });

  it('uses the production redundancy semantics for identical and disjoint content', () => {
    const context = createEvaluationMetricContext(fixtureDataset);

    expect(context.similarity('local-amber', 'local-amber-twin')).toBeCloseTo(
      1,
    );
    expect(context.similarity('local-amber', 'local-citrus')).toBe(0);
  });

  it('does not emit non-finite numeric metrics', () => {
    const recommender = createRecommender(fixtureDataset);
    const metrics = evaluateResponses(
      evaluationCases.map((evaluationCase) => ({
        evaluationCase,
        response: recommender.recommend(evaluationCase.request),
      })),
      createEvaluationMetricContext(fixtureDataset),
    );
    expectFiniteNumbers(metrics);
  });
});
