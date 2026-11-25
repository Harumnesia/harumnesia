import { isDeepStrictEqual } from 'node:util';

import {
  PerfumeDatasetSchema,
  RecommendationDatasetSchema,
} from '@harumnesia/shared';

import { normalizeConcentrationKey } from '../../../packages/recommender/src/concentration.js';
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

function requireStringArray(value: unknown, artifactName: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== 'string' || entry.length === 0)
  ) {
    throw new Error(`${artifactName} must be an array of non-empty strings.`);
  }
  const entries = value as string[];
  if (new Set(entries).size !== entries.length) {
    throw new Error(`${artifactName} must not contain duplicate values.`);
  }
  return entries;
}

function validateCanonicalMap(
  canonicalMap: Record<string, unknown>,
  groups: ReadonlySet<string>,
  artifactName: string,
): Set<string> {
  const targets = new Set<string>();
  for (const [key, value] of Object.entries(canonicalMap)) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(
        `${artifactName}.canonicalMap["${key}"] must be a non-empty string target.`,
      );
    }
    const normalizedKey = normalizeConcentrationKey(key);
    if (normalizedKey.length === 0) {
      throw new Error(
        `${artifactName}.canonicalMap must not contain an empty or whitespace-only key.`,
      );
    }
    if (normalizedKey !== key) {
      throw new Error(
        `${artifactName}.canonicalMap key "${key}" is not normalized; expected "${normalizedKey}".`,
      );
    }
    if (!groups.has(value)) {
      throw new Error(
        `${artifactName}.canonicalMap target ${value} is missing from the taxonomy groups.`,
      );
    }
    targets.add(value);
  }
  return targets;
}

function validateGroupMembership(
  groupsField: unknown,
  expected: Record<string, readonly string[]>,
  artifactName: string,
): void {
  const groups = requireObject(groupsField, `${artifactName}.groups`);
  const keys = Object.keys(groups).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (!isDeepStrictEqual(keys, expectedKeys)) {
    throw new Error(
      `${artifactName}.groups must define exactly ${expectedKeys.join(', ')}.`,
    );
  }
  for (const [groupName, members] of Object.entries(expected)) {
    const actual = requireStringArray(
      groups[groupName],
      `${artifactName}.groups.${groupName}`,
    );
    if (!isDeepStrictEqual(actual, [...members])) {
      throw new Error(
        `${artifactName}.groups.${groupName} does not match the taxonomy array for that group.`,
      );
    }
  }
}

/**
 * The concentration artifact is an audited document (schemaVersion 2), not a
 * projection derived from the source CSV. Keep the structural invariants strict
 * and verify that every value the source pipeline produces is still represented.
 */
export function validateConcentrationTaxonomy(
  actualText: string,
  generated: { values: string[] },
  artifactName: string,
): void {
  const artifact = requireObject(
    parseJson(actualText, artifactName),
    artifactName,
  );
  if (artifact.schemaVersion !== 2) {
    throw new Error(`${artifactName} schemaVersion must be 2.`);
  }
  const values = requireStringArray(artifact.values, `${artifactName}.values`);
  const formats = requireStringArray(
    artifact.formats,
    `${artifactName}.formats`,
  );
  const brandDesignations = requireStringArray(
    artifact.brandDesignations,
    `${artifactName}.brandDesignations`,
  );
  const canonicalMap = requireObject(
    artifact.canonicalMap,
    `${artifactName}.canonicalMap`,
  );

  const groupList = [...values, ...formats, ...brandDesignations];
  if (new Set(groupList).size !== groupList.length) {
    throw new Error(
      `${artifactName} taxonomy groups must not share or repeat values.`,
    );
  }
  const groups = new Set(groupList);
  const targets = validateCanonicalMap(canonicalMap, groups, artifactName);
  for (const group of groups) {
    if (!targets.has(group)) {
      throw new Error(
        `${artifactName} group ${group} has no canonical mapping target.`,
      );
    }
  }
  validateGroupMembership(
    artifact.groups,
    {
      concentration: values,
      format: formats,
      brandDesignation: brandDesignations,
    },
    artifactName,
  );
  for (const generatedValue of generated.values) {
    if (!groups.has(generatedValue)) {
      throw new Error(
        `${artifactName} is missing source-derived concentration value ${generatedValue}.`,
      );
    }
    if (!targets.has(generatedValue)) {
      throw new Error(
        `${artifactName} source-derived value ${generatedValue} has no canonical alias in canonicalMap.`,
      );
    }
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
  validateConcentrationTaxonomy(
    bundle.concentrations,
    taxonomies.concentrations,
    'data/taxonomy/concentrations.json',
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
