export function EditorialArtwork({ priority = false }: { priority?: boolean }) {
  return (
    <picture className="editorial-artwork">
      <source
        sizes="(min-width: 64rem) 45vw, (min-width: 48rem) 65vw, 100vw"
        srcSet="/assets/editorial/harumnesia-still-life-540.webp 540w, /assets/editorial/harumnesia-still-life-810.webp 810w, /assets/editorial/harumnesia-still-life-1086.webp 1086w"
        type="image/webp"
      />
      <img
        alt=""
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        height={1448}
        loading={priority ? 'eager' : 'lazy'}
        src="/assets/editorial/harumnesia-still-life-1086.webp"
        width={1086}
      />
    </picture>
  );
}
