import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createNoteQualityReport,
  createTaxonomyDocuments,
  serializeMinified,
  serializePretty,
  sha256,
} from '../src/artifacts.js';
import { resolveConcentrationArtifact } from '../src/concentration-artifact.js';
import { analyzeDataset } from '../src/integrity.js';
import { mapLocalRecord } from '../src/mappers.js';
import { projectRecommendationDataset } from '../src/runtime.js';
import {
  validateArtifactBundle,
  type ArtifactBundleText,
} from '../src/validation.js';

function auditedConcentrations(values: string[]) {
  return {
    schemaVersion: 2,
    values,
    formats: [],
    brandDesignations: [],
    groups: {
      concentration: values,
      format: [],
      brandDesignation: [],
    },
    canonicalMap: Object.fromEntries(values.map((value) => [value, value])),
  };
}

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
    concentrations: serializePretty(
      auditedConcentrations(taxonomies.concentrations.values),
    ),
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

  it('fails when a canonical concentration target drifts', () => {
    const bundle = createValidBundle();
    bundle.concentrations = mutateJson(
      bundle.concentrations,
      (concentrations) => {
        const canonicalMap = (
          concentrations as { canonicalMap: Record<string, unknown> }
        ).canonicalMap;
        canonicalMap.EDP = 'UNKNOWN';
      },
    );
    expect(() => validateArtifactBundle(bundle)).toThrow(
      'canonicalMap target UNKNOWN',
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

  it('fails when the concentration schema version is not 2', () => {
    const bundle = createValidBundle();
    bundle.concentrations = mutateJson(
      bundle.concentrations,
      (concentrations) => {
        (concentrations as { schemaVersion: number }).schemaVersion = 1;
      },
    );
    expect(() => validateArtifactBundle(bundle)).toThrow(
      'schemaVersion must be 2',
    );
  });

  it('fails when a taxonomy group repeats a member', () => {
    const bundle = createValidBundle();
    bundle.concentrations = serializePretty({
      ...auditedConcentrations(['EDP']),
      values: ['EDP', 'EDP'],
    });
    expect(() => validateArtifactBundle(bundle)).toThrow('duplicate');
  });

  it('rejects empty, unnormalized and whitespace-padded canonical map keys', () => {
    for (const key of ['', '   ', 'edp', ' edp ']) {
      const bundle = createValidBundle();
      bundle.concentrations = serializePretty({
        ...auditedConcentrations(['EDP']),
        canonicalMap: { 'EAU DE PARFUM': 'EDP', [key]: 'EDP' },
      });
      expect(() => validateArtifactBundle(bundle), key).toThrow(/canonicalMap/);
    }
  });

  it('rejects non-string, empty and unknown canonical map values', () => {
    for (const value of [42, null, '', 'UNKNOWN']) {
      const bundle = createValidBundle();
      bundle.concentrations = serializePretty({
        ...auditedConcentrations(['EDP']),
        canonicalMap: { 'EAU DE PARFUM': 'EDP', EXTRA: value },
      });
      expect(() => validateArtifactBundle(bundle), String(value)).toThrow(
        /canonicalMap/,
      );
    }
  });

  it('fails when the groups field drifts from the taxonomy arrays', () => {
    const bundle = createValidBundle();
    bundle.concentrations = mutateJson(
      bundle.concentrations,
      (concentrations) => {
        const groups = (concentrations as { groups: Record<string, unknown> })
          .groups;
        groups.concentration = [];
      },
    );
    expect(() => validateArtifactBundle(bundle)).toThrow(
      'does not match the taxonomy array',
    );
  });
});

describe('audited concentration artifact protection', () => {
  const withTempDir = async (
    run: (dir: string, artifactPath: string) => Promise<void>,
  ) => {
    const dir = await mkdtemp(path.join(tmpdir(), 'harumnesia-artifact-'));
    try {
      await run(dir, path.join(dir, 'concentrations.json'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };

  it('preserves an audited v2 artifact byte-for-byte', async () => {
    await withTempDir(async (_dir, artifactPath) => {
      const text = serializePretty({
        ...auditedConcentrations(['EDP']),
        formats: ['ATTAR'],
        brandDesignations: ['ELIXIR'],
        groups: {
          concentration: ['EDP'],
          format: ['ATTAR'],
          brandDesignation: ['ELIXIR'],
        },
        canonicalMap: {
          'EAU DE PARFUM': 'EDP',
          ATTAR: 'ATTAR',
          ELIXIR: 'ELIXIR',
        },
      });
      await writeFile(artifactPath, text, 'utf8');

      const decision = await resolveConcentrationArtifact(artifactPath, {
        text: '{"generated":true}',
        values: ['EDP'],
      });

      expect(decision.preserved).toBe(true);
      expect(decision.text).toBe(text);
      expect(await readFile(artifactPath, 'utf8')).toBe(text);
    });
  });

  it('refuses to overwrite a legacy v1 artifact', async () => {
    await withTempDir(async (_dir, artifactPath) => {
      const legacy = serializePretty({
        schemaVersion: 1,
        values: ['EDP'],
        rawValues: ['EDP'],
      });
      await writeFile(artifactPath, legacy, 'utf8');

      await expect(
        resolveConcentrationArtifact(artifactPath, {
          text: '{"generated":true}',
          values: ['EDP'],
        }),
      ).rejects.toThrow('schemaVersion 1');

      expect(await readFile(artifactPath, 'utf8')).toBe(legacy);
    });
  });

  it('fails before writing anything when generated values are uncovered', async () => {
    await withTempDir(async (dir, artifactPath) => {
      const audited = serializePretty(auditedConcentrations(['EDP']));
      await writeFile(artifactPath, audited, 'utf8');

      await expect(
        resolveConcentrationArtifact(artifactPath, {
          text: '{"generated":true}',
          values: ['EDP', 'XDP'],
        }),
      ).rejects.toThrow('missing source-derived concentration value XDP');

      expect(await readFile(artifactPath, 'utf8')).toBe(audited);
      expect(await readdir(dir)).toEqual(['concentrations.json']);
    });
  });

  it('requires the audited artifact to exist', async () => {
    await withTempDir(async (dir, artifactPath) => {
      await expect(
        resolveConcentrationArtifact(artifactPath, {
          text: '{"generated":true}',
          values: ['EDP'],
        }),
      ).rejects.toThrow('no longer generates this artifact');
      expect(await readdir(dir)).toEqual([]);
    });
  });
});
