import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  PerfumeDatasetSchema,
  PerfumeSchema,
  type Perfume,
} from '@harumnesia/shared';

import {
  assertRequiredHeaders,
  parseDelimitedRecords,
  type CsvRecord,
} from './csv.js';
import {
  analyzeDataset,
  assertDatasetIntegrity,
  collectTaxonomy,
} from './integrity.js';
import {
  INTERNATIONAL_DATASET_NAME,
  INTERNATIONAL_HEADERS,
  LOCAL_DATASET_NAME,
  LOCAL_HEADERS,
  mapInternationalRecord,
  mapLocalRecord,
} from './mappers.js';
import {
  CONCENTRATION_MAPPINGS,
  GENDER_MAPPINGS,
  NOTE_ALIASES,
  normalizeIdentityText,
} from './normalize.js';
import { OUTPUT_PATHS, SOURCE_PATHS } from './paths.js';

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(buffer: Uint8Array | string): string {
  return createHash('sha256').update(buffer).digest('hex');
}

async function readUtf8Csv(
  filePath: string,
  delimiter: string,
): Promise<{
  bytes: Buffer;
  records: CsvRecord[];
}> {
  const bytes = await readFile(filePath);
  return {
    bytes,
    records: parseDelimitedRecords(bytes.toString('utf8'), delimiter),
  };
}

async function readInternationalCsv(): Promise<{
  bytes: Buffer;
  records: CsvRecord[];
}> {
  const bytes = await readFile(SOURCE_PATHS.international);
  const decoded = new TextDecoder('windows-1252').decode(bytes);
  return { bytes, records: parseDelimitedRecords(decoded, ';') };
}

function validateMappedRecord(record: Perfume, sourceName: string): Perfume {
  const result = PerfumeSchema.safeParse(record);
  if (!result.success) {
    throw new Error(
      `Invalid mapped record from ${sourceName}: ${result.error.message}`,
    );
  }
  return result.data;
}

async function historicalCrossCheck(records: readonly Perfume[]) {
  const [cleanCombined, legacyCombined, cosine] = await Promise.all([
    readUtf8Csv(SOURCE_PATHS.historicalCleanCombined, ','),
    readUtf8Csv(SOURCE_PATHS.historicalLegacyCombined, ','),
    readUtf8Csv(SOURCE_PATHS.historicalCosine, ','),
  ]);

  const localByLegacyId = new Map(
    records
      .filter(
        (record) =>
          record.market === 'local' && record.source.legacyId !== null,
      )
      .map((record) => [record.source.legacyId, record]),
  );
  const historicalLocalRows = legacyCombined.records.filter((row) =>
    (row.ID_Perfume ?? '').startsWith('HRMN-'),
  );
  const localLegacyIdsMatched = historicalLocalRows.filter((row) =>
    localByLegacyId.has(row.ID_Perfume ?? ''),
  ).length;
  const localNamesMatched = historicalLocalRows.filter((row) => {
    const canonical = localByLegacyId.get(row.ID_Perfume ?? '');
    return canonical
      ? normalizeIdentityText(canonical.name) ===
          normalizeIdentityText(row.perfume ?? '')
      : false;
  }).length;
  const cleanCombinedLocalRows = cleanCombined.records.slice(
    0,
    historicalLocalRows.length,
  );
  const identicalStageRows = cleanCombinedLocalRows.filter((row) => {
    const top = normalizeIdentityText(row['top notes'] ?? '');
    return (
      top === normalizeIdentityText(row['mid notes'] ?? '') &&
      top === normalizeIdentityText(row['base notes'] ?? '')
    );
  }).length;
  const rowsDifferingFromCanonicalStages = cleanCombinedLocalRows.filter(
    (row) => {
      const canonical = localByLegacyId.get(row.ID_Perfume ?? '');
      if (!canonical) {
        return true;
      }

      return (
        normalizeIdentityText(row['top notes'] ?? '') !==
          normalizeIdentityText(canonical.rawNotes.top ?? '') ||
        normalizeIdentityText(row['mid notes'] ?? '') !==
          normalizeIdentityText(canonical.rawNotes.middle ?? '') ||
        normalizeIdentityText(row['base notes'] ?? '') !==
          normalizeIdentityText(canonical.rawNotes.base ?? '')
      );
    },
  ).length;

  return {
    referenceRecordCounts: {
      cleanCombined: cleanCombined.records.length,
      legacyCombined: legacyCombined.records.length,
      finalCosine: cosine.records.length,
    },
    canonicalCoverageMatchesHistoricalTotal:
      records.length === legacyCombined.records.length,
    localLegacyIdsMatched,
    localNamesMatched,
    cleanCombinedLocalRowsWithIdenticalStages: identicalStageRows,
    cleanCombinedLocalRowsDifferingFromCanonicalStages:
      rowsDifferingFromCanonicalStages,
    canonicalSourceWins: true,
    discrepancies: [
      'The clean combined file overwrites local middle/base stages and is not used as canonical input.',
      'The final cosine file collapses staged notes and omits canonical metadata.',
      'Historical FRGN IDs depend on merge ordering and are not reused as canonical IDs.',
    ],
  };
}

export async function buildDataset(): Promise<{
  records: Perfume[];
  hash: string;
}> {
  const [localSource, internationalSource] = await Promise.all([
    readUtf8Csv(SOURCE_PATHS.local, ','),
    readInternationalCsv(),
  ]);

  assertRequiredHeaders(localSource.records, LOCAL_HEADERS, LOCAL_DATASET_NAME);
  assertRequiredHeaders(
    internationalSource.records,
    INTERNATIONAL_HEADERS,
    INTERNATIONAL_DATASET_NAME,
  );

  const records = [
    ...localSource.records.map((record) =>
      validateMappedRecord(mapLocalRecord(record), LOCAL_DATASET_NAME),
    ),
    ...internationalSource.records.map((record) =>
      validateMappedRecord(
        mapInternationalRecord(record),
        INTERNATIONAL_DATASET_NAME,
      ),
    ),
  ].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
  );

  assertDatasetIntegrity(records, {
    enforceExpectedCounts: true,
    enforceSortedIds: true,
  });

  const taxonomy = collectTaxonomy(records);
  const concentrationRawValues = [
    ...new Set(
      records
        .map((record) => record.concentration.raw)
        .filter((value): value is string => value !== null),
    ),
  ].sort();
  const concentrationValues = [
    ...new Set(
      records
        .map((record) => record.concentration.value)
        .filter((value): value is string => value !== null),
    ),
  ].sort();
  const unresolvedConcentrations = [
    ...new Set(
      records
        .filter(
          (record) =>
            record.concentration.raw !== null &&
            record.concentration.value === null,
        )
        .map((record) => record.concentration.raw as string),
    ),
  ].sort();

  const perfumesJson = serialize(records);
  const outputs = {
    perfumes: perfumesJson,
    notes: serialize({
      schemaVersion: 1,
      values: taxonomy.notes,
      aliases: NOTE_ALIASES,
    }),
    accords: serialize({ schemaVersion: 1, values: taxonomy.accords }),
    genders: serialize({
      schemaVersion: 1,
      values: ['men', 'women', 'unisex', 'unknown'],
      sourceMappings: GENDER_MAPPINGS,
    }),
    concentrations: serialize({
      schemaVersion: 1,
      values: concentrationValues,
      rawValues: concentrationRawValues,
      sourceMappings: CONCENTRATION_MAPPINGS,
      unresolvedRawValues: unresolvedConcentrations,
    }),
  };

  const report = {
    schemaVersion: 1,
    sources: {
      local: {
        dataset: LOCAL_DATASET_NAME,
        encoding: 'UTF-8',
        delimiter: ',',
        records: localSource.records.length,
        sha256: sha256(localSource.bytes),
      },
      international: {
        dataset: INTERNATIONAL_DATASET_NAME,
        encoding: 'Windows-1252',
        delimiter: ';',
        records: internationalSource.records.length,
        sha256: sha256(internationalSource.bytes),
      },
    },
    output: {
      perfumesSha256: sha256(perfumesJson),
      notesTaxonomySize: taxonomy.notes.length,
      accordsTaxonomySize: taxonomy.accords.length,
    },
    integrity: analyzeDataset(records),
    historicalCrossCheck: await historicalCrossCheck(records),
  };

  await Promise.all([
    mkdir(path.dirname(OUTPUT_PATHS.perfumes), { recursive: true }),
    mkdir(path.dirname(OUTPUT_PATHS.notes), { recursive: true }),
    mkdir(path.dirname(OUTPUT_PATHS.report), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(OUTPUT_PATHS.perfumes, outputs.perfumes, 'utf8'),
    writeFile(OUTPUT_PATHS.notes, outputs.notes, 'utf8'),
    writeFile(OUTPUT_PATHS.accords, outputs.accords, 'utf8'),
    writeFile(OUTPUT_PATHS.genders, outputs.genders, 'utf8'),
    writeFile(OUTPUT_PATHS.concentrations, outputs.concentrations, 'utf8'),
    writeFile(OUTPUT_PATHS.report, serialize(report), 'utf8'),
  ]);

  return { records, hash: report.output.perfumesSha256 };
}

export async function validateGeneratedDataset(): Promise<{
  records: number;
  hash: string;
}> {
  const [
    perfumesText,
    notesText,
    accordsText,
    gendersText,
    concentrationsText,
  ] = await Promise.all([
    readFile(OUTPUT_PATHS.perfumes, 'utf8'),
    readFile(OUTPUT_PATHS.notes, 'utf8'),
    readFile(OUTPUT_PATHS.accords, 'utf8'),
    readFile(OUTPUT_PATHS.genders, 'utf8'),
    readFile(OUTPUT_PATHS.concentrations, 'utf8'),
  ]);
  const records = PerfumeDatasetSchema.parse(JSON.parse(perfumesText));
  assertDatasetIntegrity(records, {
    enforceExpectedCounts: true,
    enforceSortedIds: true,
  });

  const taxonomy = collectTaxonomy(records);
  const notes = JSON.parse(notesText) as { values?: unknown };
  const accords = JSON.parse(accordsText) as { values?: unknown };
  const genders = JSON.parse(gendersText) as { values?: unknown };
  const concentrations = JSON.parse(concentrationsText) as { values?: unknown };

  if (JSON.stringify(notes.values) !== JSON.stringify(taxonomy.notes)) {
    throw new Error('Notes taxonomy does not match production records.');
  }
  if (JSON.stringify(accords.values) !== JSON.stringify(taxonomy.accords)) {
    throw new Error('Accords taxonomy does not match production records.');
  }
  if (!Array.isArray(genders.values) || !Array.isArray(concentrations.values)) {
    throw new Error('Categorical taxonomy files are malformed.');
  }

  return { records: records.length, hash: sha256(perfumesText) };
}
