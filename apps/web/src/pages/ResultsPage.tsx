import { Link } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { SystemState } from '../components/SystemState.js';
import { PerfumeCard } from '../components/perfume/PerfumeCard.js';
import { useRecommendationExperience } from '../features/recommendation/useRecommendationExperience.js';

export function ResultsPage() {
  const { results } = useRecommendationExperience();

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
      <section className="page-intro page-intro--results section-shell">
        <p className="folio-label">Harumnesia / Your considered edit</p>
        <h1>{results.length} fragrances, chosen with intention.</h1>
        <p className="lede">
          Each match reflects a different part of your scent profile. The
          reasons below explain the connection—without exposing technical
          scores.
        </p>
        <div className="page-intro__aside">
          <span className="eyebrow">The curated {results.length}</span>
          <Link className="text-link" to="/discover">
            <span aria-hidden="true">←</span> Refine your choices
          </Link>
        </div>
      </section>
      <section
        className="results-list section-shell"
        aria-label="Recommended fragrances"
      >
        <PerfumeCard perfume={results[0]!} showReasons />
        {results.length > 1 ? (
          <div className="results-list__supporting">
            <div className="results-list__heading">
              <span className="folio-label">
                02 — {String(results.length).padStart(2, '0')}
              </span>
              <p>Supporting folio repertoire</p>
            </div>
            <div className="results-list__grid">
              {results.slice(1).map((perfume) => (
                <PerfumeCard key={perfume.id} perfume={perfume} showReasons />
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
