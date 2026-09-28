import { describe, expect, it } from 'vitest';

import {
  createNoteQualityReport,
  createTaxonomyDocuments,
  serializeMinified,
  serializePretty,
  sha256,
} from '../src/artifacts.js';
import { analyzeDataset } from '../src/integrity.js';
import { mapLocalRecord } from '../src/mappers.js';
import { projectRecommendationDataset } from '../src/runtime.js';
import {
  validateArtifactBundle,
  type ArtifactBundleText,
} from '../src/validation.js';

function createValidBundle(): ArtifactBundleText {
  const canonical = [
    mapLocalRecord({
      No: '1',
      ID_Perfume: 'HRMN-0001',
      perfume: 'Example',
      brand: 'Brand',
      price: '100000',
      size: '50',
      concentrate: 'EDP',
      'top notes': 'Bergamot',
      'mid notes': 'Rose',
      'base notes': 'Musk',
      situation: 'Day',
      image: 'https://example.test/image.jpg',
      gender: 'Unisex',
    }),
  ];
  const taxonomies = createTaxonomyDocuments(canonical);
  const runtime = projectRecommendationDataset(canonical);
  const quality = createNoteQualityReport(canonical);
  const perfumes = serializePretty(canonical);
  const runtimeRecommendation = serializeMinified(runtime);
  const noteQualityReport = serializePretty(quality);
  const output = {
    perfumesSha256: sha256(perfumes),
    perfumesBytes: Buffer.byteLength(perfumes, 'utf8'),
    runtimeRecommendationSha256: sha256(runtimeRecommendation),
    runtimeRecommendationBytes: Buffer.byteLength(
      runtimeRecommendation,
      'utf8',
    ),
    runtimeRecommendationRecords: runtime.length,
    notesTaxonomySize: taxonomies.notes.values.length,
    accordsTaxonomySize: taxonomies.accords.values.length,
    noteQualityReportSha256: sha256(noteQualityReport),
  };

  return {
    perfumes,
    runtimeRecommendation,
    notes: serializePretty(taxonomies.notes),
    accords: serializePretty(taxonomies.accords),
    genders: serializePretty(taxonomies.genders),
    concentrations: serializePretty(taxonomies.concentrations),
    noteQualityReport,
    buildReport: serializePretty({
      schemaVersion: 1,
      sources: {},
      output,
      integrity: analyzeDataset(canonical),
      historicalCrossCheck: {},
    }),
  };
}

function mutateJson(
  text: string,
  mutation: (value: unknown) => void,
  minified = false,
): string {
  const value = JSON.parse(text) as unknown;
  mutation(value);
  return minified ? serializeMinified(value) : serializePretty(value);
}

describe('generated artifact validation', () => {
  it('accepts a consistent artifact bundle', () => {
    expect(validateArtifactBundle(createValidBundle()).records).toBe(1);
  });

  it('fails when the perfumes hash differs from the build report', () => {
    const bundle = createValidBundle();
    bundle.buildReport = mutateJson(bundle.buildReport, (report) => {
      const output = (report as { output: Record<string, unknown> }).output;
      output.perfumesSha256 = '0'.repeat(64);
    });
    expect(() => validateArtifactBundle(bundle)).toThrow('Build report output');
  });

  it('fails when notes aliases drift', () => {
    const bundle = createValidBundle();
    bundle.notes = mutateJson(bundle.notes, (notes) => {
      const aliases = (notes as { aliases: Record<string, unknown> }).aliases;
      aliases.blackcurrant = 'incorrect';
    });
    expect(() => validateArtifactBundle(bundle)).toThrow('Notes taxonomy');
  });

  it('fails when gender mappings drift', () => {
    const bundle = createValidBundle();
    bundle.genders = mutateJson(bundle.genders, (genders) => {
      const mappings = (genders as { sourceMappings: Record<string, unknown> })
        .sourceMappings;
      mappings.female = 'men';
    });
    expect(() => validateArtifactBundle(bundle)).toThrow('Gender taxonomy');
  });

  it('fails when concentration mappings drift', () => {
    const bundle = createValidBundle();
    bundle.concentrations = mutateJson(
      bundle.concentrations,
      (concentrations) => {
        const mappings = (
          concentrations as { sourceMappings: Record<string, unknown> }
        ).sourceMappings;
        mappings.EDP = 'EDT';
      },
    );
    expect(() => validateArtifactBundle(bundle)).toThrow(
      'Concentration taxonomy',
    );
  });

  it('fails when the runtime ID set differs from canonical', () => {
    const bundle = createValidBundle();
    bundle.runtimeRecommendation = mutateJson(
      bundle.runtimeRecommendation,
      (runtime) => {
        (runtime as Array<Record<string, unknown>>)[0]!.id = 'local-hrmn-9999';
      },
      true,
    );
    expect(() => validateArtifactBundle(bundle)).toThrow(
      'does not match the canonical projection',
    );
  });

  it('fails when a runtime record is structurally invalid', () => {
    const bundle = createValidBundle();
    bundle.runtimeRecommendation = mutateJson(
      bundle.runtimeRecommendation,
      (runtime) => {
        delete (runtime as Array<Record<string, unknown>>)[0]!.name;
      },
      true,
    );
    expect(() => validateArtifactBundle(bundle)).toThrow();
  });
});
