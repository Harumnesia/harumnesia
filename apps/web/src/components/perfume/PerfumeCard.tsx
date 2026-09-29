import { Link } from 'react-router-dom';

import type { RecommendationViewModel } from '../../features/recommendation/types.js';
import { FragranceArtwork } from './FragranceArtwork.js';

export function PerfumeCard({
  perfume,
  showReasons = false,
}: {
  perfume: RecommendationViewModel;
  showReasons?: boolean;
}) {
  return (
    <article className="perfume-card">
      <div className="perfume-card__visual">
        {showReasons ? (
          <span className="rank" aria-label={`Recommendation ${perfume.rank}`}>
            {String(perfume.rank).padStart(2, '0')}
          </span>
        ) : null}
        <FragranceArtwork compact tone={perfume.visualTone} />
      </div>
      <div className="perfume-card__body">
        <p className="eyebrow">{perfume.brand}</p>
        <h2>{perfume.name}</h2>
        <p className="metadata">
          {perfume.marketLabel} · {perfume.genderLabel}
          {perfume.concentration ? ` · ${perfume.concentration}` : ''}
        </p>
        {perfume.priceLabel ? (
          <p className="price">{perfume.priceLabel}</p>
        ) : null}
        <ul className="tag-list" aria-label="Key notes">
          {perfume.keyNotes.slice(0, 4).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        {perfume.accords.length > 0 ? (
          <p className="card-fact">
            <strong>Accords</strong> {perfume.accords.slice(0, 3).join(' · ')}
          </p>
        ) : null}
        {perfume.occasions.length > 0 ? (
          <p className="card-fact">
            <strong>Occasions</strong> {perfume.occasions.join(' · ')}
          </p>
        ) : null}
        {showReasons && perfume.reasons.length > 0 ? (
          <div className="match-reasons">
            <h3>Why it fits</h3>
            <ul>
              {perfume.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link className="text-link" to={`/perfume/${perfume.id}`}>
          Explore fragrance <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
