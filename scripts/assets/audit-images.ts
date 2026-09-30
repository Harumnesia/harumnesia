import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PerfumeDatasetSchema,
  RecommendationDatasetSchema,
  type Perfume,
  type RecommendationPerfume,
} from '@harumnesia/shared';

const EXPECTED_BASELINE = {
  total: 25_127,
  local: 1_064,
  international: 24_063,
  localWithImage: 1_064,
  internationalWithImage: 0,
} as const;

type CountEntry = { value: string; count: number };

export type ImageAuditReport = ReturnType<typeof buildImageAuditReport>;

function sortedCounts(values: readonly string[]): CountEntry[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) =>
      right.count === left.count
        ? left.value.localeCompare(right.value)
        : right.count - left.count,
    );
}

function apparentExtension(url: URL): string {
  const filename = url.pathname.split('/').at(-1) ?? '';
  const match = /\.([a-z0-9]{1,8})$/i.exec(filename);
  return match?.[1]?.toLowerCase() ?? '(none)';
}

function assertBaseline(report: {
  totals: { records: number };
  markets: {
    local: { records: number; withImage: number };
    international: { records: number; withImage: number };
  };
}): void {
  const actual = {
    total: report.totals.records,
    local: report.markets.local.records,
    international: report.markets.international.records,
    localWithImage: report.markets.local.withImage,
    internationalWithImage: report.markets.international.withImage,
  };

  for (const key of Object.keys(EXPECTED_BASELINE) as Array<
    keyof typeof EXPECTED_BASELINE
  >) {
    if (actual[key] !== EXPECTED_BASELINE[key]) {
      throw new Error(
        `Canonical dataset image baseline drifted for ${key}: expected ${EXPECTED_BASELINE[key]}, received ${actual[key]}.`,
      );
    }
  }
}

export function buildImageAuditReport(
  perfumes: readonly Perfume[],
  runtimePerfumes: readonly RecommendationPerfume[],
) {
  const withImage = perfumes.filter(
    (perfume): perfume is Perfume & { image: string } => perfume.image !== null,
  );
  const local = perfumes.filter((perfume) => perfume.market === 'local');
  const international = perfumes.filter(
    (perfume) => perfume.market === 'international',
  );
  const runtimeIds = new Set(runtimePerfumes.map(({ id }) => id));
  const canonicalById = new Map(
    perfumes.map((perfume) => [perfume.id, perfume]),
  );
  const urlGroups = new Map<string, string[]>();
  const protocols: string[] = [];
  const hostnames: string[] = [];
  const extensions: string[] = [];
  const malformedUrls: Array<{ value: string; perfumeIds: string[] }> = [];

  for (const perfume of withImage) {
    const ids = urlGroups.get(perfume.image) ?? [];
    ids.push(perfume.id);
    urlGroups.set(perfume.image, ids);
  }

  for (const [value, perfumeIds] of [...urlGroups].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    try {
      const url = new URL(value);
      protocols.push(url.protocol.replace(/:$/, '').toLowerCase());
      hostnames.push(url.hostname.toLowerCase());
      extensions.push(apparentExtension(url));
    } catch {
      malformedUrls.push({ value, perfumeIds: [...perfumeIds].sort() });
    }
  }

  const duplicateGroups = [...urlGroups]
    .filter(([, ids]) => ids.length > 1)
    .map(([url, ids]) => ({ url, perfumeIds: [...ids].sort() }))
    .sort((left, right) => left.url.localeCompare(right.url));
  const runtimeIdsMissingFromCanonical = [...runtimeIds]
    .filter((id) => !canonicalById.has(id))
    .sort();
  const canonicalIdsMissingFromRuntime = perfumes
    .filter(({ id }) => !runtimeIds.has(id))
    .map(({ id }) => id)
    .sort();
  const runtimeRecordsWithoutImageReference = runtimePerfumes.filter(
    ({ id }) => canonicalById.get(id)?.image === null,
  ).length;

  const report = {
    schemaVersion: 1,
    source: {
      canonical: 'data/perfumes.json',
      runtime: 'data/runtime/recommendation.json',
    },
    policy:
      'An external image reference is provenance information, not redistribution permission or a production asset.',
    totals: {
      records: perfumes.length,
      withImage: withImage.length,
      withoutImage: perfumes.length - withImage.length,
    },
    markets: {
      local: {
        records: local.length,
        withImage: local.filter(({ image }) => image !== null).length,
        withoutImage: local.filter(({ image }) => image === null).length,
      },
      international: {
        records: international.length,
        withImage: international.filter(({ image }) => image !== null).length,
        withoutImage: international.filter(({ image }) => image === null)
          .length,
      },
    },
    references: {
      uniqueUrls: urlGroups.size,
      duplicateUrlGroups: duplicateGroups.length,
      duplicateReferences: duplicateGroups.reduce(
        (count, group) => count + group.perfumeIds.length - 1,
        0,
      ),
      protocols: sortedCounts(protocols),
      hostnames: sortedCounts(hostnames),
      apparentExtensions: sortedCounts(extensions),
      malformedUrls,
      duplicateGroups,
    },
    runtimeCoverage: {
      runtimeRecords: runtimePerfumes.length,
      runtimeRecordsWithCanonicalImageReference:
        runtimePerfumes.length - runtimeRecordsWithoutImageReference,
      runtimeRecordsWithoutCanonicalImageReference:
        runtimeRecordsWithoutImageReference,
      runtimeIdsMissingFromCanonical,
      canonicalIdsMissingFromRuntime,
    },
  };

  assertBaseline(report);
  if (
    runtimeIdsMissingFromCanonical.length > 0 ||
    canonicalIdsMissingFromRuntime.length > 0
  ) {
    throw new Error(
      'Canonical and recommendation runtime IDs are inconsistent.',
    );
  }
  return report;
}

export async function runImageAudit(rootDirectory = process.cwd()) {
  const canonicalPath = path.join(rootDirectory, 'data', 'perfumes.json');
  const runtimePath = path.join(
    rootDirectory,
    'data',
    'runtime',
    'recommendation.json',
  );
  const reportPath = path.join(
    rootDirectory,
    'scripts',
    'assets',
    'image-audit-report.json',
  );
  const [canonicalText, runtimeText] = await Promise.all([
    readFile(canonicalPath, 'utf8'),
    readFile(runtimePath, 'utf8'),
  ]);
  const report = buildImageAuditReport(
    PerfumeDatasetSchema.parse(JSON.parse(canonicalText) as unknown),
    RecommendationDatasetSchema.parse(JSON.parse(runtimeText) as unknown),
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const report = await runImageAudit();
  console.log(
    `Audited ${report.totals.records} perfumes: ${report.totals.withImage} image references, ${report.references.uniqueUrls} unique URLs, ${report.references.duplicateUrlGroups} duplicate groups.`,
  );
}
