import { describe, expect, it } from 'vitest';

import {
  createPerfumeImageManifest,
  resolvePerfumeImageAsset,
  type PerfumeImageAsset,
} from './perfume-image-manifest.js';

const APPROVED_ASSET: PerfumeImageAsset = {
  perfumeId: 'local-hrmn-0001',
  width: 960,
  height: 1200,
  sources: {
    avif: [
      { src: '/assets/perfumes/local-hrmn-0001/320.avif', width: 320 },
      { src: '/assets/perfumes/local-hrmn-0001/640.avif', width: 640 },
    ],
    webp: [{ src: '/assets/perfumes/local-hrmn-0001/320.webp', width: 320 }],
    fallback: [
      { src: '/assets/perfumes/local-hrmn-0001/fallback.jpg', width: 960 },
    ],
  },
  provenance: {
    type: 'owned',
    sourceReference: 'internal-photo-session-001',
  },
};

describe('perfume image manifest', () => {
  it('resolves approved local assets deterministically', () => {
    const manifest = createPerfumeImageManifest([APPROVED_ASSET]);
    const first = resolvePerfumeImageAsset(APPROVED_ASSET.perfumeId, manifest);
    expect(first).toEqual(APPROVED_ASSET);
    expect(resolvePerfumeImageAsset(APPROVED_ASSET.perfumeId, manifest)).toBe(
      first,
    );
    expect(resolvePerfumeImageAsset('local-hrmn-9999', manifest)).toBeNull();
  });

  it('rejects duplicate canonical IDs', () => {
    expect(() =>
      createPerfumeImageManifest([APPROVED_ASSET, APPROVED_ASSET]),
    ).toThrow(/duplicate perfume image asset/i);
  });

  it('rejects an entry without provenance', () => {
    const invalid = {
      ...APPROVED_ASSET,
      provenance: undefined,
    } as unknown as PerfumeImageAsset;
    expect(() => createPerfumeImageManifest([invalid])).toThrow(/provenance/i);
  });

  it('rejects remote image sources', () => {
    const invalid: PerfumeImageAsset = {
      ...APPROVED_ASSET,
      sources: {
        fallback: [{ src: 'https://images.example/bottle.jpg', width: 960 }],
      },
    };
    expect(() => createPerfumeImageManifest([invalid])).toThrow(
      /local canonical-ID asset path/i,
    );
  });
});
