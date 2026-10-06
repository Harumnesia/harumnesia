/** The desktop artwork is a continuous scene; small screens keep the supplied portrait. */
export function LandingArtwork() {
  return (
    <picture className="editorial-artwork">
      <source
        media="(min-width: 64rem)"
        sizes="100vw"
        srcSet="/assets/editorial/harumnesia-landing-canvas-1254.webp 1254w, /assets/editorial/harumnesia-landing-canvas-1672.webp 1672w"
        type="image/webp"
      />
      <source
        sizes="(min-width: 48rem) 65vw, 100vw"
        srcSet="/assets/editorial/harumnesia-still-life-540.webp 540w, /assets/editorial/harumnesia-still-life-810.webp 810w, /assets/editorial/harumnesia-still-life-1086.webp 1086w"
        type="image/webp"
      />
      <img
        alt=""
        decoding="async"
        fetchPriority="high"
        height={1448}
        loading="eager"
        src="/assets/editorial/harumnesia-still-life-1086.webp"
        width={1086}
      />
    </picture>
  );
}
