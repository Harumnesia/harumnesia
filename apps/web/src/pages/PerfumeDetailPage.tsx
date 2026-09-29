import { Link, useParams } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { FragranceArtwork } from '../components/perfume/FragranceArtwork.js';
import {
  findFixturePerfume,
  toRecommendationViewModel,
} from '../fixtures/perfumes.js';

function NotePyramid({
  notes,
}: {
  notes: { top: string[]; middle: string[]; base: string[] };
}) {
  const layers = [
    ['Top', notes.top],
    ['Middle', notes.middle],
    ['Base', notes.base],
  ] as const;

  return (
    <div className="note-pyramid">
      {layers.map(([label, values]) => (
        <div key={label}>
          <h3>{label}</h3>
          <p>{values.length > 0 ? values.join(' · ') : 'Not listed'}</p>
        </div>
      ))}
    </div>
  );
}

export function PerfumeDetailPage() {
  const { id } = useParams();
  const perfume = findFixturePerfume(id);

  if (!perfume) {
    return (
      <section className="empty-state section-shell section-shell--narrow">
        <PageTitle title="Fragrance not found" />
        <p className="eyebrow">Lost on the scent trail</p>
        <h1>We could not find that fragrance.</h1>
        <p className="lede">
          The link may be outdated, or this fragrance is not part of the preview
          collection.
        </p>
        <Link className="button" to="/results">
          Browse the edit
        </Link>
      </section>
    );
  }

  const view = toRecommendationViewModel(perfume, 1, []);

  return (
    <>
      <PageTitle title={perfume.name} />
      <article className="detail section-shell">
        <div className="detail__art">
          <Link className="text-link" to="/results">
            <span aria-hidden="true">←</span> Back to recommendations
          </Link>
          <FragranceArtwork tone={view.visualTone} />
        </div>
        <div className="detail__content">
          <p className="eyebrow">{perfume.brand}</p>
          <h1>{perfume.name}</h1>
          <p className="metadata">
            {view.marketLabel} · {view.genderLabel}
            {perfume.concentration ? ` · ${perfume.concentration}` : ''}
          </p>
          {view.priceLabel ? (
            <p className="detail__price">{view.priceLabel}</p>
          ) : null}
          <p className="detail__intro">
            Explore the structure of this fragrance through its listed notes and
            character. Missing metadata is intentionally left unclaimed.
          </p>

          <section aria-labelledby="notes-heading" className="detail-section">
            <p className="eyebrow">Composition</p>
            <h2 id="notes-heading">The note pyramid</h2>
            <NotePyramid notes={perfume.notes} />
          </section>

          {perfume.accords.length > 0 ? (
            <section
              aria-labelledby="accords-heading"
              className="detail-section"
            >
              <p className="eyebrow">Character</p>
              <h2 id="accords-heading">Main accords</h2>
              <ul className="tag-list">
                {perfume.accords.map((accord) => (
                  <li key={accord}>{accord}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {perfume.occasion.length > 0 ? (
            <section
              aria-labelledby="occasions-heading"
              className="detail-section"
            >
              <p className="eyebrow">Best suited</p>
              <h2 id="occasions-heading">Occasions</h2>
              <ul className="tag-list">
                {perfume.occasion.map((occasion) => (
                  <li key={occasion}>{occasion}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}
