import { useState } from 'react';

import {
  PERFUME_IMAGE_MANIFEST,
  resolvePerfumeImageAsset,
  type PerfumeImageManifest,
  type PerfumeImageVariant,
} from '../../assets/perfume-image-manifest.js';
import type { FragranceVisualTone } from '../../features/recommendation/types.js';
import { FragranceArtwork } from './FragranceArtwork.js';

function toSrcSet(variants: readonly PerfumeImageVariant[]): string {
  return variants.map(({ src, width }) => `${src} ${width}w`).join(', ');
}

export function PerfumeVisual({
  perfumeId,
  perfumeName,
  tone,
  compact = false,
  sizes = '(min-width: 70rem) 33vw, (min-width: 48rem) 50vw, 100vw',
  manifest = PERFUME_IMAGE_MANIFEST,
}: {
  perfumeId: string;
  perfumeName: string;
  tone: FragranceVisualTone;
  compact?: boolean;
  sizes?: string;
  manifest?: PerfumeImageManifest;
}) {
  const asset = resolvePerfumeImageAsset(perfumeId, manifest);
  const failureKey = asset
    ? `${perfumeId}:${asset.sources.fallback.at(-1)?.src ?? ''}`
    : null;
  const [failedAsset, setFailedAsset] = useState<string | null>(null);

  if (!asset || failedAsset === failureKey) {
    return <FragranceArtwork compact={compact} tone={tone} />;
  }

  const fallback = asset.sources.fallback.at(-1);
  if (!fallback) return <FragranceArtwork compact={compact} tone={tone} />;

  return (
    <picture
      className={`perfume-visual${compact ? ' perfume-visual--compact' : ''}`}
    >
      {asset.sources.avif?.length ? (
        <source
          sizes={sizes}
          srcSet={toSrcSet(asset.sources.avif)}
          type="image/avif"
        />
      ) : null}
      {asset.sources.webp?.length ? (
        <source
          sizes={sizes}
          srcSet={toSrcSet(asset.sources.webp)}
          type="image/webp"
        />
      ) : null}
      <img
        alt={asset.alt?.trim() || `${perfumeName} fragrance`}
        decoding="async"
        height={asset.height}
        loading="lazy"
        onError={() => setFailedAsset(failureKey)}
        sizes={sizes}
        src={fallback.src}
        srcSet={toSrcSet(asset.sources.fallback)}
        width={asset.width}
      />
    </picture>
  );
}
