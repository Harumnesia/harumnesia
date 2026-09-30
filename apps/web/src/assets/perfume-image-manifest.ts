export const PERFUME_IMAGE_PROVENANCE_TYPES = [
  'owned',
  'licensed',
  'permission',
  'public-domain',
  'generated',
] as const;

export type PerfumeImageProvenanceType =
  (typeof PERFUME_IMAGE_PROVENANCE_TYPES)[number];

export type PerfumeImageVariant = {
  src: string;
  width: number;
};

export type PerfumeImageAsset = {
  perfumeId: string;
  width: number;
  height: number;
  alt?: string;
  sources: {
    avif?: readonly PerfumeImageVariant[];
    webp?: readonly PerfumeImageVariant[];
    fallback: readonly PerfumeImageVariant[];
  };
  provenance: {
    type: PerfumeImageProvenanceType;
    sourceReference?: string;
    licenseReference?: string;
  };
};

export type PerfumeImageManifest = Readonly<
  Record<string, Readonly<PerfumeImageAsset>>
>;

const CANONICAL_ID_PATTERN =
  /^(?:local-[a-z0-9-]+|international-[a-f0-9]{16})$/;
const LOCAL_ASSET_PATTERN = /^\/assets\/perfumes\/([^/]+)\/[a-z0-9._-]+$/;

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function validateVariants(
  perfumeId: string,
  format: 'avif' | 'webp' | 'fallback',
  variants: readonly PerfumeImageVariant[] | undefined,
  sourceWidth: number,
): void {
  if (format === 'fallback' && (!variants || variants.length === 0)) {
    throw new Error(`${perfumeId} must provide a fallback image variant.`);
  }

  let previousWidth = 0;
  const sources = new Set<string>();
  for (const variant of variants ?? []) {
    assertPositiveInteger(variant.width, `${perfumeId} ${format} width`);
    if (variant.width > sourceWidth) {
      throw new Error(`${perfumeId} ${format} variant must not be upscaled.`);
    }
    if (variant.width <= previousWidth) {
      throw new Error(
        `${perfumeId} ${format} variants must use unique ascending widths.`,
      );
    }
    previousWidth = variant.width;

    const match = LOCAL_ASSET_PATTERN.exec(variant.src);
    if (!match || match[1] !== perfumeId) {
      throw new Error(
        `${perfumeId} ${format} source must be a local canonical-ID asset path.`,
      );
    }
    const extensionPattern =
      format === 'fallback' ? /\.(?:jpe?g|png)$/ : new RegExp(`\\.${format}$`);
    if (!extensionPattern.test(variant.src)) {
      throw new Error(
        `${perfumeId} ${format} source has an invalid extension.`,
      );
    }
    if (sources.has(variant.src)) {
      throw new Error(`${perfumeId} contains a duplicate ${format} source.`);
    }
    sources.add(variant.src);
  }
}

function validateProvenance(asset: PerfumeImageAsset): void {
  if (
    !asset.provenance ||
    !PERFUME_IMAGE_PROVENANCE_TYPES.includes(asset.provenance.type)
  ) {
    throw new Error(`${asset.perfumeId} is missing valid image provenance.`);
  }

  if (
    ['licensed', 'permission', 'public-domain'].includes(
      asset.provenance.type,
    ) &&
    (!asset.provenance.sourceReference || !asset.provenance.licenseReference)
  ) {
    throw new Error(
      `${asset.perfumeId} provenance requires source and license references.`,
    );
  }
}

export function createPerfumeImageManifest(
  entries: readonly PerfumeImageAsset[],
): PerfumeImageManifest {
  const manifest: Record<string, Readonly<PerfumeImageAsset>> = {};

  for (const asset of [...entries].sort((left, right) =>
    left.perfumeId.localeCompare(right.perfumeId),
  )) {
    if (!CANONICAL_ID_PATTERN.test(asset.perfumeId)) {
      throw new Error(
        `${asset.perfumeId} is not a supported canonical perfume ID.`,
      );
    }
    if (manifest[asset.perfumeId]) {
      throw new Error(`Duplicate perfume image asset: ${asset.perfumeId}.`);
    }
    assertPositiveInteger(asset.width, `${asset.perfumeId} width`);
    assertPositiveInteger(asset.height, `${asset.perfumeId} height`);
    validateProvenance(asset);
    validateVariants(asset.perfumeId, 'avif', asset.sources.avif, asset.width);
    validateVariants(asset.perfumeId, 'webp', asset.sources.webp, asset.width);
    validateVariants(
      asset.perfumeId,
      'fallback',
      asset.sources.fallback,
      asset.width,
    );
    const freezeVariants = (variants: readonly PerfumeImageVariant[] = []) =>
      Object.freeze(variants.map((variant) => Object.freeze({ ...variant })));
    manifest[asset.perfumeId] = Object.freeze({
      ...asset,
      sources: Object.freeze({
        ...(asset.sources.avif
          ? { avif: freezeVariants(asset.sources.avif) }
          : {}),
        ...(asset.sources.webp
          ? { webp: freezeVariants(asset.sources.webp) }
          : {}),
        fallback: freezeVariants(asset.sources.fallback),
      }),
      provenance: Object.freeze({ ...asset.provenance }),
    });
  }

  return Object.freeze(manifest);
}

export function resolvePerfumeImageAsset(
  perfumeId: string,
  manifest: PerfumeImageManifest = PERFUME_IMAGE_MANIFEST,
): Readonly<PerfumeImageAsset> | null {
  return manifest[perfumeId] ?? null;
}

// Intentionally empty: canonical source URLs are references, not redistribution rights.
export const PERFUME_IMAGE_MANIFEST = createPerfumeImageManifest([]);
