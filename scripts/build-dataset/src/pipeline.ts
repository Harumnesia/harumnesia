import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PerfumeSchema, type Perfume } from '@harumnesia/shared';

import {
  createNoteQualityReport,
  createTaxonomyDocuments,
  serializeMinified,
  serializePretty,
  sha256,
} from './artifacts.js';
import {
  assertRequiredHeaders,
  parseDelimitedRecords,
  type CsvRecord,
} from './csv.js';
import { analyzeDataset, assertDatasetIntegrity } from './integrity.js';
import {
  INTERNATIONAL_DATASET_NAME,
  INTERNATIONAL_HEADERS,
  LOCAL_DATASET_NAME,
  LOCAL_HEADERS,
  mapInternationalRecord,
  mapLocalRecord,
} from './mappers.js';
import { normalizeIdentityText } from './normalize.js';
import { OUTPUT_PATHS, SOURCE_PATHS } from './paths.js';
import {
  projectRecommendationDataset,
  RUNTIME_SIZE_LIMIT_BYTES,
} from './runtime.js';
import {
  validateArtifactBundle,
  type ArtifactBundleText,
} from './validation.js';

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
  runtimeHash: string;
  runtimeBytes: number;
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

  const taxonomies = createTaxonomyDocuments(records);
  const runtime = projectRecommendationDataset(records);
  const noteQualityReport = createNoteQualityReport(records);
  const perfumesJson = serializePretty(records);
  const runtimeJson = serializeMinified(runtime);
  const noteQualityJson = serializePretty(noteQualityReport);
  const runtimeBytes = Buffer.byteLength(runtimeJson, 'utf8');
  if (runtimeBytes >= RUNTIME_SIZE_LIMIT_BYTES) {
    throw new Error(
      `Runtime recommendation dataset is ${runtimeBytes} bytes; the limit is ${RUNTIME_SIZE_LIMIT_BYTES} bytes.`,
    );
  }

  const outputs = {
    perfumes: perfumesJson,
    runtimeRecommendation: runtimeJson,
    notes: serializePretty(taxonomies.notes),
    accords: serializePretty(taxonomies.accords),
    genders: serializePretty(taxonomies.genders),
    concentrations: serializePretty(taxonomies.concentrations),
    noteQualityReport: noteQualityJson,
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
      perfumesBytes: Buffer.byteLength(perfumesJson, 'utf8'),
      runtimeRecommendationSha256: sha256(runtimeJson),
      runtimeRecommendationBytes: runtimeBytes,
      runtimeRecommendationRecords: runtime.length,
      notesTaxonomySize: taxonomies.notes.values.length,
      accordsTaxonomySize: taxonomies.accords.values.length,
      noteQualityReportSha256: sha256(noteQualityJson),
    },
    integrity: analyzeDataset(records),
    historicalCrossCheck: await historicalCrossCheck(records),
  };
  const bundle: ArtifactBundleText = {
    ...outputs,
    buildReport: serializePretty(report),
  };
  validateArtifactBundle(bundle, { enforceExpectedCounts: true });

  await Promise.all([
    mkdir(path.dirname(OUTPUT_PATHS.perfumes), { recursive: true }),
    mkdir(path.dirname(OUTPUT_PATHS.runtimeRecommendation), {
      recursive: true,
    }),
    mkdir(path.dirname(OUTPUT_PATHS.notes), { recursive: true }),
    mkdir(path.dirname(OUTPUT_PATHS.report), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(OUTPUT_PATHS.perfumes, outputs.perfumes, 'utf8'),
    writeFile(
      OUTPUT_PATHS.runtimeRecommendation,
      outputs.runtimeRecommendation,
      'utf8',
    ),
    writeFile(OUTPUT_PATHS.notes, outputs.notes, 'utf8'),
    writeFile(OUTPUT_PATHS.accords, outputs.accords, 'utf8'),
    writeFile(OUTPUT_PATHS.genders, outputs.genders, 'utf8'),
    writeFile(OUTPUT_PATHS.concentrations, outputs.concentrations, 'utf8'),
    writeFile(OUTPUT_PATHS.report, bundle.buildReport, 'utf8'),
    writeFile(
      OUTPUT_PATHS.noteQualityReport,
      outputs.noteQualityReport,
      'utf8',
    ),
  ]);

  return {
    records,
    hash: report.output.perfumesSha256,
    runtimeHash: report.output.runtimeRecommendationSha256,
    runtimeBytes,
  };
}

export async function validateGeneratedDataset(): Promise<{
  records: number;
  hash: string;
  runtimeHash: string;
  runtimeBytes: number;
}> {
  const [
    perfumesText,
    runtimeRecommendationText,
    notesText,
    accordsText,
    gendersText,
    concentrationsText,
    buildReportText,
    noteQualityReportText,
  ] = await Promise.all([
    readFile(OUTPUT_PATHS.perfumes, 'utf8'),
    readFile(OUTPUT_PATHS.runtimeRecommendation, 'utf8'),
    readFile(OUTPUT_PATHS.notes, 'utf8'),
    readFile(OUTPUT_PATHS.accords, 'utf8'),
    readFile(OUTPUT_PATHS.genders, 'utf8'),
    readFile(OUTPUT_PATHS.concentrations, 'utf8'),
    readFile(OUTPUT_PATHS.report, 'utf8'),
    readFile(OUTPUT_PATHS.noteQualityReport, 'utf8'),
  ]);
  const result = validateArtifactBundle(
    {
      perfumes: perfumesText,
      runtimeRecommendation: runtimeRecommendationText,
      notes: notesText,
      accords: accordsText,
      genders: gendersText,
      concentrations: concentrationsText,
      buildReport: buildReportText,
      noteQualityReport: noteQualityReportText,
    },
    { enforceExpectedCounts: true },
  );

  return {
    records: result.records,
    hash: result.canonicalHash,
    runtimeHash: result.runtimeHash,
    runtimeBytes: result.runtimeBytes,
  };
}
