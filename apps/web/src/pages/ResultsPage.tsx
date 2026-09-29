import { Link } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { PerfumeCard } from '../components/perfume/PerfumeCard.js';
import { useRecommendationExperience } from '../features/recommendation/useRecommendationExperience.js';

export function ResultsPage() {
  const { results } = useRecommendationExperience();

  if (results === null) {
    return (
      <section className="empty-state section-shell section-shell--narrow">
        <PageTitle title="Start a fragrance discovery" />
        <p className="eyebrow">No recommendation session yet</p>
        <h1>Start with your fragrance preferences.</h1>
        <p className="lede">
          Choose the notes, accords, and context you enjoy to prepare a real
          recommendation edit.
        </p>
        <Link className="button" to="/discover">
          Start discovery
        </Link>
      </section>
    );
  }

  if (results.length === 0) {
    return (
      <section className="empty-state section-shell section-shell--narrow">
        <PageTitle title="No matches yet" />
        <p className="eyebrow">A little too precise</p>
        <h1>No fragrances met every boundary.</h1>
        <p className="lede">
          Try widening the market, budget, or strict filters. Your preferences
          can stay exactly as they are.
        </p>
        <Link className="button" to="/discover">
          Adjust filters
        </Link>
      </section>
    );
  }

  return (
    <>
      <PageTitle title="Your fragrance edit" />
      <section className="page-intro section-shell">
        <p className="eyebrow">Your considered edit</p>
        <h1>{results.length} fragrances, chosen with intention.</h1>
        <p className="lede">
          Each match reflects a different part of your scent profile. The
          reasons below explain the connection—without exposing technical
          scores.
        </p>
        <Link className="text-link" to="/discover">
          <span aria-hidden="true">←</span> Refine your choices
        </Link>
      </section>
      <section
        className="results-list section-shell"
        aria-label="Recommended fragrances"
      >
        {results.map((perfume) => (
          <PerfumeCard key={perfume.id} perfume={perfume} showReasons />
        ))}
      </section>
    </>
  );
}
