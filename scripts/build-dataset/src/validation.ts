import { isDeepStrictEqual } from 'node:util';

import {
  PerfumeDatasetSchema,
  RecommendationDatasetSchema,
} from '@harumnesia/shared';

import {
  createNoteQualityReport,
  createTaxonomyDocuments,
  sha256,
} from './artifacts.js';
import { analyzeDataset, assertDatasetIntegrity } from './integrity.js';
import {
  assertRuntimeConsistency,
  RUNTIME_SIZE_LIMIT_BYTES,
} from './runtime.js';

export type ArtifactBundleText = {
  perfumes: string;
  runtimeRecommendation: string;
  notes: string;
  accords: string;
  genders: string;
  concentrations: string;
  buildReport: string;
  noteQualityReport: string;
};

type ValidationOptions = {
  enforceExpectedCounts?: boolean;
};

function parseJson(text: string, artifactName: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      `${artifactName} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function requireObject(
  value: unknown,
  artifactName: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${artifactName} must contain a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function requireDeepEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (!isDeepStrictEqual(actual, expected)) {
    throw new Error(message);
  }
}

export function validateArtifactBundle(
  bundle: ArtifactBundleText,
  options: ValidationOptions = {},
) {
  const canonical = PerfumeDatasetSchema.parse(
    parseJson(bundle.perfumes, 'data/perfumes.json'),
  );
  assertDatasetIntegrity(canonical, {
    enforceExpectedCounts: options.enforceExpectedCounts ?? false,
    enforceSortedIds: true,
  });

  const runtime = RecommendationDatasetSchema.parse(
    parseJson(bundle.runtimeRecommendation, 'data/runtime/recommendation.json'),
  );
  assertRuntimeConsistency(canonical, runtime);

  const taxonomies = createTaxonomyDocuments(canonical);
  requireDeepEqual(
    parseJson(bundle.notes, 'data/taxonomy/notes.json'),
    taxonomies.notes,
    'Notes taxonomy values or metadata drifted from canonical data and source constants.',
  );
  requireDeepEqual(
    parseJson(bundle.accords, 'data/taxonomy/accords.json'),
    taxonomies.accords,
    'Accords taxonomy values or metadata drifted from canonical data.',
  );
  requireDeepEqual(
    parseJson(bundle.genders, 'data/taxonomy/genders.json'),
    taxonomies.genders,
    'Gender taxonomy values or source mappings drifted from canonical constants.',
  );
  requireDeepEqual(
    parseJson(bundle.concentrations, 'data/taxonomy/concentrations.json'),
    taxonomies.concentrations,
    'Concentration taxonomy values or metadata drifted from canonical data and source constants.',
  );

  const expectedQualityReport = createNoteQualityReport(canonical);
  requireDeepEqual(
    parseJson(
      bundle.noteQualityReport,
      'scripts/build-dataset/note-quality-report.json',
    ),
    expectedQualityReport,
    'Note quality report drifted from the canonical notes taxonomy.',
  );

  const report = requireObject(
    parseJson(bundle.buildReport, 'scripts/build-dataset/build-report.json'),
    'scripts/build-dataset/build-report.json',
  );
  if (report.schemaVersion !== 1) {
    throw new Error('Build report schemaVersion must be 1.');
  }
  requireObject(report.sources, 'build-report.sources');
  requireObject(
    report.historicalCrossCheck,
    'build-report.historicalCrossCheck',
  );

  const expectedOutput = {
    perfumesSha256: sha256(bundle.perfumes),
    perfumesBytes: Buffer.byteLength(bundle.perfumes, 'utf8'),
    runtimeRecommendationSha256: sha256(bundle.runtimeRecommendation),
    runtimeRecommendationBytes: Buffer.byteLength(
      bundle.runtimeRecommendation,
      'utf8',
    ),
    runtimeRecommendationRecords: runtime.length,
    notesTaxonomySize: taxonomies.notes.values.length,
    accordsTaxonomySize: taxonomies.accords.values.length,
    noteQualityReportSha256: sha256(bundle.noteQualityReport),
  };
  if (expectedOutput.runtimeRecommendationBytes >= RUNTIME_SIZE_LIMIT_BYTES) {
    throw new Error(
      `Runtime recommendation dataset exceeds the ${RUNTIME_SIZE_LIMIT_BYTES}-byte limit.`,
    );
  }
  requireDeepEqual(
    report.output,
    expectedOutput,
    'Build report output hashes, sizes, counts, or taxonomy statistics do not match generated artifacts.',
  );
  requireDeepEqual(
    report.integrity,
    analyzeDataset(canonical),
    'Build report integrity statistics do not match canonical data.',
  );

  return {
    records: canonical.length,
    canonicalHash: expectedOutput.perfumesSha256,
    runtimeHash: expectedOutput.runtimeRecommendationSha256,
    runtimeBytes: expectedOutput.runtimeRecommendationBytes,
  };
}
