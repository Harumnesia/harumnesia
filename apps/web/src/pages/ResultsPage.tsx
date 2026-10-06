import { Link } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { SystemState } from '../components/SystemState.js';
import { RecommendationCard } from '../components/perfume/RecommendationCard.js';
import { DatasetStat } from '../components/editorial/DatasetStat.js';
import { EditorialArtwork } from '../components/editorial/EditorialArtwork.js';
import {
  ProfileSummary,
  PreferenceSummary,
} from '../components/editorial/ProfileSummary.js';
import { useRecommendationExperience } from '../features/recommendation/useRecommendationExperience.js';

export function ResultsPage() {
  const { results, lastForm } = useRecommendationExperience();

  if (results === null) {
    return (
      <SystemState
        title="Start a fragrance discovery"
        eyebrow="No recommendation session yet"
        heading="Start with your fragrance preferences."
        description="Choose the notes, accords, and context you enjoy to prepare a real recommendation edit."
        tone="empty"
      >
        <Link className="button" to="/discover">
          Start discovery
        </Link>
      </SystemState>
    );
  }

  if (results.length === 0) {
    return (
      <SystemState
        title="No matches yet"
        eyebrow="A little too precise"
        heading="No fragrances met every boundary."
        description="Try widening the market, budget, or strict filters. Your preferences can stay exactly as they are."
        tone="empty"
      >
        <Link className="button" to="/discover">
          Adjust filters
        </Link>
      </SystemState>
    );
  }

  return (
    <>
      <PageTitle title="Your fragrance edit" />
      <div className="results-layout section-shell">
        <section className="editorial-intro results-intro">
          <p className="folio-label">Your matches</p>
          <h1>
            Top {results.length}{' '}
            {results.length === 1 ? 'fragrance' : 'fragrances'}{' '}
            <em className="editorial-nowrap">for you.</em>
          </h1>
          <p className="lede">
            An edit based on your preferences, with a different scent to explore
            in every match. Each recommendation includes reasons so you can
            understand the connection.
          </p>
          <div className="results-preferences">
            <PreferenceSummary form={lastForm} />
            <Link className="text-link" to="/discover">
              <span aria-hidden="true">←</span> Refine your choices
            </Link>
          </div>
        </section>
        <section
          className="recommendation-list"
          aria-label="Recommended fragrances"
        >
          <RecommendationCard perfume={results[0]!} />
          {results.length > 1 ? (
            <div className="recommendation-list__grid">
              {results.slice(1).map((perfume) => (
                <RecommendationCard key={perfume.id} perfume={perfume} />
              ))}
            </div>
          ) : null}
        </section>
        <aside
          className="editorial-rail results-rail"
          aria-label="Your recommendation profile"
        >
          <ProfileSummary form={lastForm} />
          <DatasetStat />
          <div className="results-rail__art">
            <EditorialArtwork />
          </div>
          <p className="editorial-statement">
            Curated by notes, accords, and you.
          </p>
        </aside>
      </div>
    </>
  );
}
