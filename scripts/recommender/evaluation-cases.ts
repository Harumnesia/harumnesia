import type { RecommendationPerfume } from '@harumnesia/shared';

import type { RecommendationRequestInput } from '../../packages/recommender/src/index.js';

export const EVALUATION_SEGMENTS = [
  'notes-only',
  'accords-only',
  'local-structured',
  'international-structured',
  'cross-market-mixed',
  'filter-only',
  'empty-request',
] as const;

export type EvaluationSegment = (typeof EVALUATION_SEGMENTS)[number];

export type EvaluationCase = {
  id: string;
  segment: EvaluationSegment;
  source: 'frequency-stratum' | 'anchor' | 'control';
  request: RecommendationRequestInput;
};

type TermFrequency = {
  term: string;
  frequency: number;
};

function flattenNotes(perfume: RecommendationPerfume): string[] {
  return [...perfume.notes.top, ...perfume.notes.middle, ...perfume.notes.base];
}

function documentFrequencies(
  dataset: readonly RecommendationPerfume[],
  select: (perfume: RecommendationPerfume) => readonly string[],
): TermFrequency[] {
  const frequencies = new Map<string, number>();
  for (const perfume of dataset) {
    for (const term of new Set(select(perfume))) {
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
    }
  }
  return [...frequencies]
    .map(([term, frequency]) => ({ term, frequency }))
    .sort(
      (left, right) =>
        right.frequency - left.frequency || left.term.localeCompare(right.term),
    );
}

function evenlySpaced<T>(values: readonly T[], count: number): T[] {
  if (count <= 0 || values.length === 0) return [];
  if (values.length <= count) return [...values];

  return Array.from({ length: count }, (_, index) => {
    const selectedIndex = Math.floor(((index + 0.5) * values.length) / count);
    return values[Math.min(selectedIndex, values.length - 1)]!;
  });
}

function selectFrequencyStrata(
  frequencies: readonly TermFrequency[],
  perStratum: number,
): { common: string[]; medium: string[]; rare: string[] } {
  const total = frequencies.length;
  const commonWindow = frequencies.slice(0, Math.max(perStratum, total / 5));
  const mediumWindow = frequencies.slice(
    Math.floor(total * 0.4),
    Math.max(Math.floor(total * 0.6), Math.floor(total * 0.4) + perStratum),
  );
  const rareWindow = frequencies.slice(Math.floor(total * 0.8));

  return {
    common: evenlySpaced(commonWindow, perStratum).map(({ term }) => term),
    medium: evenlySpaced(mediumWindow, perStratum).map(({ term }) => term),
    rare: evenlySpaced(rareWindow, perStratum).map(({ term }) => term),
  };
}

function computeIdf(
  documentCount: number,
  frequencies: readonly TermFrequency[],
): Map<string, number> {
  return new Map(
    frequencies.map(({ term, frequency }) => [
      term,
      Math.log((documentCount + 1) / (frequency + 1)) + 1,
    ]),
  );
}

function selectAnchorTerms(
  values: readonly string[],
  idf: ReadonlyMap<string, number>,
  maximum: number,
): string[] {
  const ranked = [...new Set(values)].sort(
    (left, right) =>
      (idf.get(right) ?? 0) - (idf.get(left) ?? 0) || left.localeCompare(right),
  );
  if (ranked.length <= maximum) return ranked;

  const indexes = [0, Math.floor((ranked.length - 1) / 2), ranked.length - 1];
  return [...new Set(indexes)].slice(0, maximum).map((index) => ranked[index]!);
}

function preferredGender(perfume: RecommendationPerfume) {
  return perfume.gender === 'unknown' ? [] : [perfume.gender];
}

function buildNotesOnlyCases(
  strata: ReturnType<typeof selectFrequencyStrata>,
): EvaluationCase[] {
  const cases: EvaluationCase[] = [];
  for (const [stratum, terms] of Object.entries(strata)) {
    terms.forEach((term, index) => {
      cases.push({
        id: `notes-${stratum}-single-${index + 1}`,
        segment: 'notes-only',
        source: 'frequency-stratum',
        request: { preferences: { notes: [term] } },
      });
    });
  }

  for (let index = 0; index < 12; index += 1) {
    const notes = [
      strata.common[index % strata.common.length],
      strata.medium[(index * 3) % strata.medium.length],
      ...(index < 8 ? [strata.rare[(index * 5) % strata.rare.length]] : []),
    ].filter((term): term is string => term !== undefined);
    cases.push({
      id: `notes-multiple-${index + 1}`,
      segment: 'notes-only',
      source: 'frequency-stratum',
      request: { preferences: { notes } },
    });
  }
  return cases;
}

function buildAccordsOnlyCases(
  strata: ReturnType<typeof selectFrequencyStrata>,
): EvaluationCase[] {
  const cases: EvaluationCase[] = [];
  for (const [stratum, terms] of Object.entries(strata)) {
    terms.forEach((term, index) => {
      cases.push({
        id: `accords-${stratum}-single-${index + 1}`,
        segment: 'accords-only',
        source: 'frequency-stratum',
        request: { preferences: { accords: [term] } },
      });
    });
  }

  for (let index = 0; index < 6; index += 1) {
    const accords = [
      strata.common[index % strata.common.length],
      strata.medium[(index * 3) % strata.medium.length],
      strata.rare[(index * 5) % strata.rare.length],
    ].filter((term): term is string => term !== undefined);
    cases.push({
      id: `accords-multiple-${index + 1}`,
      segment: 'accords-only',
      source: 'frequency-stratum',
      request: { preferences: { accords } },
    });
  }
  return cases;
}

function buildLocalAnchorCases(
  anchors: readonly RecommendationPerfume[],
  notesIdf: ReadonlyMap<string, number>,
): EvaluationCase[] {
  return anchors.map((anchor, index) => {
    const preferences = {
      notes: selectAnchorTerms(flattenNotes(anchor), notesIdf, 3),
      genders: preferredGender(anchor),
      ...(anchor.occasion[0] ? { occasions: [anchor.occasion[0]] } : {}),
      ...(anchor.concentration
        ? { concentrations: [anchor.concentration] }
        : {}),
    };
    const filters = {
      markets: ['local' as const],
      excludeIds: [anchor.id],
      ...(index % 3 === 0 && anchor.price
        ? {
            maxPrice: {
              amount: anchor.price.amount,
              currency: 'IDR' as const,
            },
          }
        : {}),
    };
    return {
      id: `local-anchor-${index + 1}`,
      segment: 'local-structured' as const,
      source: 'anchor' as const,
      request: { filters, preferences },
    };
  });
}

function buildInternationalAnchorCases(
  anchors: readonly RecommendationPerfume[],
  notesIdf: ReadonlyMap<string, number>,
  accordsIdf: ReadonlyMap<string, number>,
): EvaluationCase[] {
  return anchors.map((anchor, index) => ({
    id: `international-anchor-${index + 1}`,
    segment: 'international-structured',
    source: 'anchor',
    request: {
      filters: {
        markets: ['international'],
        excludeIds: [anchor.id],
      },
      preferences: {
        notes: selectAnchorTerms(flattenNotes(anchor), notesIdf, 3),
        accords: selectAnchorTerms(anchor.accords, accordsIdf, 2),
        genders: preferredGender(anchor),
      },
    },
  }));
}

function buildCrossMarketCases(
  localAnchors: readonly RecommendationPerfume[],
  internationalAnchors: readonly RecommendationPerfume[],
  notesIdf: ReadonlyMap<string, number>,
  accordsIdf: ReadonlyMap<string, number>,
): EvaluationCase[] {
  const local = localAnchors.map((anchor, index) => ({
    id: `cross-local-anchor-${index + 1}`,
    segment: 'cross-market-mixed' as const,
    source: 'anchor' as const,
    request: {
      filters: { excludeIds: [anchor.id] },
      preferences: {
        notes: selectAnchorTerms(flattenNotes(anchor), notesIdf, 2),
        genders: preferredGender(anchor),
        ...(anchor.occasion[0] ? { occasions: [anchor.occasion[0]] } : {}),
        ...(anchor.concentration
          ? { concentrations: [anchor.concentration] }
          : {}),
      },
    },
  }));
  const international = internationalAnchors.map((anchor, index) => ({
    id: `cross-international-anchor-${index + 1}`,
    segment: 'cross-market-mixed' as const,
    source: 'anchor' as const,
    request: {
      filters: { excludeIds: [anchor.id] },
      preferences: {
        notes: selectAnchorTerms(flattenNotes(anchor), notesIdf, 2),
        accords: selectAnchorTerms(anchor.accords, accordsIdf, 2),
        genders: preferredGender(anchor),
      },
    },
  }));
  return [...local, ...international];
}

function buildFilterOnlyCases(
  dataset: readonly RecommendationPerfume[],
  commonNote: string,
): EvaluationCase[] {
  const localPrices = dataset
    .flatMap((perfume) =>
      perfume.market === 'local' && perfume.price ? [perfume.price.amount] : [],
    )
    .sort((left, right) => left - right);
  const pricePoints = [0.25, 0.5, 0.75].map(
    (quantile) => localPrices[Math.floor((localPrices.length - 1) * quantile)]!,
  );
  const concentrations = [
    ...new Set(
      dataset.flatMap((perfume) =>
        perfume.concentration ? [perfume.concentration] : [],
      ),
    ),
  ].sort();
  const occasions = [
    ...new Set(dataset.flatMap((perfume) => perfume.occasion)),
  ].sort();
  const cases: EvaluationCase[] = [
    {
      id: 'filter-market-local',
      segment: 'filter-only',
      source: 'control',
      request: { filters: { markets: ['local'] } },
    },
    {
      id: 'filter-market-international',
      segment: 'filter-only',
      source: 'control',
      request: { filters: { markets: ['international'] } },
    },
    ...(['men', 'women', 'unisex'] as const).map((gender) => ({
      id: `filter-gender-${gender}`,
      segment: 'filter-only' as const,
      source: 'control' as const,
      request: { filters: { genders: [gender] } },
    })),
    ...pricePoints.map((amount, index) => ({
      id: `filter-local-budget-${index + 1}`,
      segment: 'filter-only' as const,
      source: 'control' as const,
      request: {
        filters: {
          markets: ['local' as const],
          maxPrice: {
            amount,
            currency: 'IDR' as const,
            unknownPolicy: 'exclude' as const,
          },
        },
      },
    })),
    ...concentrations.slice(0, 2).map((concentration) => ({
      id: `filter-concentration-${concentration.toLocaleLowerCase('en-US')}`,
      segment: 'filter-only' as const,
      source: 'control' as const,
      request: {
        filters: {
          concentrations: {
            values: [concentration],
            unknownPolicy: 'exclude' as const,
          },
        },
      },
    })),
    ...occasions.slice(0, 3).map((occasion) => ({
      id: `filter-occasion-${occasion}`,
      segment: 'filter-only' as const,
      source: 'control' as const,
      request: {
        filters: {
          occasions: { values: [occasion], unknownPolicy: 'exclude' as const },
        },
      },
    })),
    {
      id: 'filter-excluded-note',
      segment: 'filter-only',
      source: 'control',
      request: { filters: { excludeNotes: [commonNote] } },
    },
  ];
  return cases;
}

export function buildEvaluationCases(
  dataset: readonly RecommendationPerfume[],
): EvaluationCase[] {
  const noteFrequencies = documentFrequencies(dataset, flattenNotes);
  const accordFrequencies = documentFrequencies(
    dataset,
    (perfume) => perfume.accords,
  );
  const notesIdf = computeIdf(dataset.length, noteFrequencies);
  const accordsIdf = computeIdf(dataset.length, accordFrequencies);
  const noteStrata = selectFrequencyStrata(noteFrequencies, 8);
  const accordStrata = selectFrequencyStrata(accordFrequencies, 6);
  const local = dataset
    .filter((perfume) => perfume.market === 'local')
    .sort((left, right) => left.id.localeCompare(right.id));
  const international = dataset
    .filter((perfume) => perfume.market === 'international')
    .sort((left, right) => left.id.localeCompare(right.id));
  const localAnchors = evenlySpaced(local, 30);
  const internationalAnchors = evenlySpaced(international, 30);

  const cases: EvaluationCase[] = [
    ...buildNotesOnlyCases(noteStrata),
    ...buildAccordsOnlyCases(accordStrata),
    ...buildLocalAnchorCases(localAnchors, notesIdf),
    ...buildInternationalAnchorCases(
      internationalAnchors,
      notesIdf,
      accordsIdf,
    ),
    ...buildCrossMarketCases(
      evenlySpaced(localAnchors, 12),
      evenlySpaced(internationalAnchors, 12),
      notesIdf,
      accordsIdf,
    ),
    ...buildFilterOnlyCases(dataset, noteStrata.common[0]!),
    {
      id: 'empty-request',
      segment: 'empty-request',
      source: 'control',
      request: {},
    },
  ];

  if (new Set(cases.map(({ id }) => id)).size !== cases.length) {
    throw new Error('Evaluation case IDs must be unique.');
  }
  return cases;
}

export function countCasesBySegment(
  cases: readonly EvaluationCase[],
): Record<EvaluationSegment, number> {
  return Object.fromEntries(
    EVALUATION_SEGMENTS.map((segment) => [
      segment,
      cases.filter((evaluationCase) => evaluationCase.segment === segment)
        .length,
    ]),
  ) as Record<EvaluationSegment, number>;
}
