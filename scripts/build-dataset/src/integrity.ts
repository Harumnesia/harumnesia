import { PerfumeDatasetSchema, type Perfume } from '@harumnesia/shared';

import {
  createInternationalCanonicalId,
  createLocalCanonicalId,
} from './id.js';
import { normalizeIdentityText } from './normalize.js';

export const EXPECTED_COUNTS = {
  total: 25_127,
  local: 1_064,
  international: 24_063,
} as const;

type Availability = {
  with: number;
  without: number;
  percentage: number;
};

function availability(count: number, total: number): Availability {
  return {
    with: count,
    without: total - count,
    percentage: Number(((count / total) * 100).toFixed(2)),
  };
}

function sortedDistribution(values: readonly string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function duplicateSummary(keys: readonly string[]): {
  groups: number;
  extraRecords: number;
} {
  const distribution = sortedDistribution(keys);
  const duplicateCounts = Object.values(distribution).filter(
    (count) => count > 1,
  );
  return {
    groups: duplicateCounts.length,
    extraRecords: duplicateCounts.reduce(
      (total, count) => total + count - 1,
      0,
    ),
  };
}

function recordWithoutId(record: Perfume): Omit<Perfume, 'id'> {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== 'id'),
  ) as Omit<Perfume, 'id'>;
}

export function assertDatasetIntegrity(
  records: readonly Perfume[],
  options: { enforceExpectedCounts?: boolean; enforceSortedIds?: boolean } = {},
): void {
  PerfumeDatasetSchema.parse(records);

  const ids = records.map((record) => record.id);
  if (new Set(ids).size !== records.length) {
    throw new Error('Dataset contains duplicate canonical IDs.');
  }

  const sourceIdentities = records.map((record) =>
    record.source.sourceType === 'local'
      ? `local:${record.source.legacyId ?? ''}`
      : `international:${record.source.sourceUrl ?? ''}`,
  );
  if (new Set(sourceIdentities).size !== records.length) {
    throw new Error('Dataset contains duplicate source identities.');
  }

  for (const record of records) {
    if (record.market !== record.source.sourceType) {
      throw new Error(`Market/sourceType mismatch for ${record.id}.`);
    }

    const expectedId =
      record.market === 'local'
        ? record.source.legacyId === null
          ? null
          : createLocalCanonicalId(record.source.legacyId)
        : record.source.sourceUrl === null
          ? null
          : createInternationalCanonicalId(record.source.sourceUrl);
    if (expectedId === null || record.id !== expectedId) {
      throw new Error(
        `Canonical ID does not match source identity for ${record.id}.`,
      );
    }

    for (const notes of Object.values(record.notes)) {
      if (notes.some((note) => note.trim() === '')) {
        throw new Error(
          `Dataset contains an empty note token for ${record.id}.`,
        );
      }
      if (new Set(notes).size !== notes.length) {
        throw new Error(
          `Dataset contains duplicate notes within a stage for ${record.id}.`,
        );
      }
    }
  }

  if (options.enforceSortedIds) {
    const sortedIds = [...ids].sort();
    if (ids.some((id, index) => id !== sortedIds[index])) {
      throw new Error('Dataset records are not sorted by canonical ID.');
    }
  }

  if (options.enforceExpectedCounts) {
    const local = records.filter((record) => record.market === 'local').length;
    const international = records.filter(
      (record) => record.market === 'international',
    ).length;
    if (
      records.length !== EXPECTED_COUNTS.total ||
      local !== EXPECTED_COUNTS.local ||
      international !== EXPECTED_COUNTS.international
    ) {
      throw new Error(
        `Unexpected record counts: total=${records.length}, local=${local}, international=${international}.`,
      );
    }
  }
}

export function analyzeDataset(records: readonly Perfume[]) {
  const total = records.length;
  const local = records.filter((record) => record.market === 'local').length;
  const international = records.filter(
    (record) => record.market === 'international',
  ).length;
  const hasAnyNotes = (record: Perfume) =>
    Object.values(record.notes).some((notes) => notes.length > 0);
  const hasAllNoteStages = (record: Perfume) =>
    Object.values(record.notes).every((notes) => notes.length > 0);

  const brandNameKeys = records.map(
    (record) =>
      `${normalizeIdentityText(record.brand)}\u0000${normalizeIdentityText(record.name)}`,
  );
  const canonicalPayloads = records.map((record) =>
    JSON.stringify(recordWithoutId(record)),
  );

  return {
    counts: {
      total,
      uniqueCanonicalIds: new Set(records.map((record) => record.id)).size,
      local,
      international,
      missingName: records.filter((record) => record.name.trim() === '').length,
      missingBrand: records.filter((record) => record.brand.trim() === '')
        .length,
    },
    distributions: {
      gender: sortedDistribution(records.map((record) => record.gender)),
      concentrationNormalized: sortedDistribution(
        records.map((record) => record.concentration.value ?? 'none'),
      ),
      concentrationRaw: sortedDistribution(
        records.map((record) => record.concentration.raw ?? 'none'),
      ),
    },
    stagedNotes: {
      anyStage: availability(records.filter(hasAnyNotes).length, total),
      allStages: availability(records.filter(hasAllNoteStages).length, total),
      missingTop: records.filter((record) => record.notes.top.length === 0)
        .length,
      missingMiddle: records.filter(
        (record) => record.notes.middle.length === 0,
      ).length,
      missingBase: records.filter((record) => record.notes.base.length === 0)
        .length,
      emptyTokens: records
        .flatMap((record) => Object.values(record.notes).flat())
        .filter((note) => note === '').length,
    },
    availability: {
      accords: availability(
        records.filter((record) => record.accords.length > 0).length,
        total,
      ),
      image: availability(
        records.filter((record) => record.image !== null).length,
        total,
      ),
      price: availability(
        records.filter((record) => record.price !== null).length,
        total,
      ),
      volume: availability(
        records.filter((record) => record.volume !== null).length,
        total,
      ),
    },
    duplicates: {
      exactCanonicalPayload: duplicateSummary(canonicalPayloads),
      normalizedBrandAndName: duplicateSummary(brandNameKeys),
      canonicalIds: total - new Set(records.map((record) => record.id)).size,
      sourceIdentities:
        total -
        new Set(
          records.map(
            (record) => record.source.sourceUrl ?? record.source.legacyId ?? '',
          ),
        ).size,
    },
    invalidNumericFields: 0,
  };
}

export function collectTaxonomy(records: readonly Perfume[]) {
  const noteValues = new Set<string>();
  const accordValues = new Set<string>();

  for (const record of records) {
    for (const note of Object.values(record.notes).flat()) {
      noteValues.add(note);
    }
    for (const accord of record.accords) {
      accordValues.add(accord);
    }
  }

  return {
    notes: [...noteValues].sort(),
    accords: [...accordValues].sort(),
  };
}
