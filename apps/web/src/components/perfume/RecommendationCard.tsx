import { Link } from 'react-router-dom';

import type { RecommendationViewModel } from '../../features/recommendation/types.js';
import { EditorialIcon } from '../editorial/EditorialIcon.js';
import { MatchReasons } from './MatchReasons.js';
import { PerfumeVisual } from './PerfumeVisual.js';

export function RecommendationCard({
  perfume,
}: {
  perfume: RecommendationViewModel;
}) {
  return (
    <article
      className={`recommendation-card${perfume.rank === 1 ? ' recommendation-card--featured' : ''}`}
    >
      <span
        className="recommendation-card__rank"
        aria-label={`Recommendation ${perfume.rank}`}
      >
        {String(perfume.rank).padStart(2, '0')}
      </span>
      <div className="recommendation-card__art">
        <PerfumeVisual
          compact
          perfumeId={perfume.id}
          perfumeName={perfume.name}
          tone={perfume.visualTone}
        />
      </div>
      <div className="recommendation-card__body">
        <div className="recommendation-card__heading">
          <div>
            <h2>{perfume.name}</h2>
            <p className="recommendation-card__brand">{perfume.brand}</p>
          </div>
          {perfume.rank === 1 ? (
            <span className="match-label">Top match</span>
          ) : null}
        </div>
        {perfume.accords.length > 0 ? (
          <p className="recommendation-card__accords">
            {perfume.accords.slice(0, 3).join(' · ')}
          </p>
        ) : null}
        {perfume.keyNotes.length > 0 ? (
          <p className="recommendation-card__notes">
            <span>Key notes</span> {perfume.keyNotes.slice(0, 4).join(' · ')}
          </p>
        ) : null}
        <MatchReasons reasons={perfume.reasons} />
      </div>
      <div className="recommendation-card__footer">
        <ul aria-label="Fragrance metadata">
          <li>
            <EditorialIcon name="globe" />
            {perfume.marketLabel}
          </li>
          {perfume.concentration ? (
            <li>
              <EditorialIcon name="bottle" />
              {perfume.concentration}
            </li>
          ) : null}
          {perfume.occasions.length > 0 ? (
            <li>
              <EditorialIcon name="moon" />
              {perfume.occasions.join(' · ')}
            </li>
          ) : null}
          {perfume.priceLabel ? (
            <li>
              <span className="sr-only">Listed price: </span>
              {perfume.priceLabel}
            </li>
          ) : null}
        </ul>
        <Link className="text-link" to={`/perfume/${perfume.id}`}>
          View details <EditorialIcon name="arrow" />
        </Link>
      </div>
    </article>
  );
}
