import { createHash } from 'node:crypto';

import type { Perfume } from '@harumnesia/shared';

import { collectTaxonomy } from './integrity.js';
import {
  CONCENTRATION_MAPPINGS,
  GENDER_MAPPINGS,
  NOTE_ALIASES,
} from './normalize.js';

export const ARTIFACT_SCHEMA_VERSION = 1;
export const CANONICAL_GENDERS = ['men', 'women', 'unisex', 'unknown'] as const;

export function serializePretty(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function serializeMinified(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createTaxonomyDocuments(records: readonly Perfume[]) {
  const taxonomy = collectTaxonomy(records);
  const rawConcentrations = records
    .map((record) => record.concentration.raw)
    .filter((value): value is string => value !== null);
  const normalizedConcentrations = records
    .map((record) => record.concentration.value)
    .filter((value): value is string => value !== null);

  return {
    notes: {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      values: taxonomy.notes,
      aliases: NOTE_ALIASES,
    },
    accords: {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      values: taxonomy.accords,
    },
    genders: {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      values: CANONICAL_GENDERS,
      sourceMappings: GENDER_MAPPINGS,
    },
    concentrations: {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      values: [...new Set(normalizedConcentrations)].sort(),
      rawValues: [...new Set(rawConcentrations)].sort(),
      sourceMappings: CONCENTRATION_MAPPINGS,
      unresolvedRawValues: [
        ...new Set(
          records
            .filter(
              (record) =>
                record.concentration.raw !== null &&
                record.concentration.value === null,
            )
            .map((record) => record.concentration.raw as string),
        ),
      ].sort(),
    },
  };
}

function parenthesisBalance(value: string): number {
  return (
    (value.match(/\(/gu) ?? []).length - (value.match(/\)/gu) ?? []).length
  );
}

export function createNoteQualityReport(records: readonly Perfume[]) {
  const values = collectTaxonomy(records).notes;
  const checks = {
    leadingAmpersand: values.filter((value) => /^&/u.test(value)),
    leadingClosingParenthesis: values.filter((value) => /^\)/u.test(value)),
    trailingOpeningParenthesis: values.filter((value) => /\($/u.test(value)),
    unmatchedParentheses: values.filter(
      (value) => parenthesisBalance(value) !== 0,
    ),
    punctuationOnly: values.filter((value) => !/[\p{L}\p{N}]/u.test(value)),
  };
  const unresolved = new Set(Object.values(checks).flat());

  return {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    taxonomySize: values.length,
    unresolvedSuspiciousTerms: [...unresolved].sort(),
    checks,
    policy:
      'Potentially meaningful terms are preserved when a safe orthographic correction is not unambiguous.',
  };
}
