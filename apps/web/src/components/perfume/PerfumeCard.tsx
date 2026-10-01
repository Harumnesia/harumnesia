import { Link } from 'react-router-dom';

import type { RecommendationViewModel } from '../../features/recommendation/types.js';
import { PerfumeVisual } from './PerfumeVisual.js';

export function PerfumeCard({
  perfume,
  showReasons = false,
  linkToDetail = true,
}: {
  perfume: RecommendationViewModel;
  showReasons?: boolean;
  linkToDetail?: boolean;
}) {
  return (
    <article className="perfume-card">
      <div className="perfume-card__visual">
        {showReasons ? (
          <span className="rank" aria-label={`Recommendation ${perfume.rank}`}>
            {String(perfume.rank).padStart(2, '0')}
          </span>
        ) : null}
        <PerfumeVisual
          compact
          perfumeId={perfume.id}
          perfumeName={perfume.name}
          tone={perfume.visualTone}
        />
      </div>
      <div className="perfume-card__body">
        <p className="eyebrow">
          {showReasons ? 'Curated fragrance / ' : 'Editorial sample / '}
          {perfume.brand}
        </p>
        <h2>{perfume.name}</h2>
        <p className="metadata">
          {perfume.marketLabel} · {perfume.genderLabel}
          {perfume.concentration ? ` · ${perfume.concentration}` : ''}
        </p>
        {perfume.priceLabel ? (
          <p className="price">
            <span>Listed price</span>
            {perfume.priceLabel}
          </p>
        ) : null}
        <p className="card-fact card-fact--label">Key notes</p>
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
        {linkToDetail ? (
          <Link className="text-link" to={`/perfume/${perfume.id}`}>
            Explore fragrance <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className="text-link">Editorial sample</span>
        )}
      </div>
    </article>
  );
}
