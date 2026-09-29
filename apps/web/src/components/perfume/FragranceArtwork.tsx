import type { FragranceVisualTone } from '../../features/recommendation/types.js';

export function FragranceArtwork({
  tone,
  compact = false,
}: {
  tone: FragranceVisualTone;
  compact?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`fragrance-art fragrance-art--${tone}${compact ? ' fragrance-art--compact' : ''}`}
    >
      <span className="fragrance-art__sun" />
      <span className="fragrance-art__leaf fragrance-art__leaf--one" />
      <span className="fragrance-art__leaf fragrance-art__leaf--two" />
      <span className="fragrance-art__bottle" />
    </div>
  );
}
