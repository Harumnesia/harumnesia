// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createPerfumeImageManifest,
  type PerfumeImageAsset,
} from '../../assets/perfume-image-manifest.js';
import { PerfumeVisual } from './PerfumeVisual.js';

afterEach(cleanup);

const asset: PerfumeImageAsset = {
  perfumeId: 'local-hrmn-0001',
  width: 960,
  height: 1200,
  sources: {
    avif: [{ src: '/assets/perfumes/local-hrmn-0001/320.avif', width: 320 }],
    webp: [{ src: '/assets/perfumes/local-hrmn-0001/320.webp', width: 320 }],
    fallback: [
      { src: '/assets/perfumes/local-hrmn-0001/fallback.jpg', width: 960 },
    ],
  },
  provenance: { type: 'owned' },
};

describe('PerfumeVisual', () => {
  it('renders responsive local sources for an approved image', () => {
    const { container } = render(
      <PerfumeVisual
        manifest={createPerfumeImageManifest([asset])}
        perfumeId={asset.perfumeId}
        perfumeName="Production Bloom"
        tone="citrus"
      />,
    );
    const image = screen.getByRole('img', {
      name: 'Production Bloom fragrance',
    });
    expect(image.getAttribute('src')).toBe(
      '/assets/perfumes/local-hrmn-0001/fallback.jpg',
    );
    expect(image.getAttribute('loading')).toBe('lazy');
    expect(container.querySelectorAll('source')).toHaveLength(2);
  });

  it('uses decorative artwork when the manifest has no image', () => {
    const { container } = render(
      <PerfumeVisual
        manifest={createPerfumeImageManifest([])}
        perfumeId="local-hrmn-0002"
        perfumeName="Fallback Bloom"
        tone="rose"
      />,
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('.fragrance-art--rose')).not.toBeNull();
  });

  it('falls back once when a local image fails to load', () => {
    const { container } = render(
      <PerfumeVisual
        manifest={createPerfumeImageManifest([asset])}
        perfumeId={asset.perfumeId}
        perfumeName="Production Bloom"
        tone="forest"
      />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('.fragrance-art--forest')).not.toBeNull();
  });
});
