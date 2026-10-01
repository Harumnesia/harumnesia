import { Link } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { FragranceArtwork } from '../components/perfume/FragranceArtwork.js';
import { PerfumeCard } from '../components/perfume/PerfumeCard.js';
import { MOCK_RECOMMENDATIONS } from '../fixtures/perfumes.js';

const STEPS = [
  [
    '01',
    'Tell us what you enjoy',
    'Choose notes, accords, and the moments you want a fragrance for.',
  ],
  [
    '02',
    'Shape the search',
    'Set practical boundaries such as market and budget—only if they matter to you.',
  ],
  [
    '03',
    'Meet your matches',
    'Explore a short, explainable edit and understand why each scent belongs.',
  ],
];

export function LandingPage() {
  return (
    <>
      <PageTitle title="Find a fragrance that feels like you" />
      <section className="hero section-shell">
        <div className="hero__copy">
          <p className="folio-label">Volume 01 / A personal fragrance guide</p>
          <h1>Find a scent with a story that feels like yours.</h1>
          <p className="lede">
            Follow your instincts through notes, moods, and moments. Harumnesia
            turns them into a considered edit of fragrances worth meeting.
          </p>
          <div className="button-row">
            <Link className="button" to="/discover">
              Begin discovery
            </Link>
            <a className="text-link" href="#how-it-works">
              See how it works <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <div className="hero__art">
          <div className="hero__art-header" aria-hidden="true">
            <span>Harumnesia / Specimen study</span>
            <span>01 — 03</span>
          </div>
          <FragranceArtwork tone="amber" />
          <p>
            <span>Fig. 01</span> Notes unfold. Memories return.
          </p>
        </div>
      </section>

      <section className="steps section-shell" id="how-it-works">
        <div className="section-heading">
          <p className="folio-label">01 / A quieter way to choose</p>
          <h2>Three steps, one considered edit.</h2>
        </div>
        <ol className="step-grid">
          {STEPS.map(([number, title, body]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="dimensions">
        <div className="section-shell dimensions__inner">
          <div>
            <p className="folio-label">02 / More than a note</p>
            <h2>Preference gives direction. Filters give boundaries.</h2>
          </div>
          <div className="dimension-list">
            <article>
              <h3>Character</h3>
              <p>Notes and accords describe the atmosphere you are drawn to.</p>
            </article>
            <article>
              <h3>Context</h3>
              <p>Occasion, expression, and concentration add useful nuance.</p>
            </article>
            <article>
              <h3>Practicality</h3>
              <p>Market, budget, and exclusions narrow the edit when needed.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="featured section-shell">
        <div className="section-heading section-heading--row">
          <div>
            <p className="folio-label">03 / From the preview collection</p>
            <h2>A few scents to begin with.</h2>
          </div>
          <Link className="text-link" to="/discover">
            Find your own edit <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="card-grid">
          {MOCK_RECOMMENDATIONS.slice(0, 3).map((perfume) => (
            <PerfumeCard
              key={perfume.id}
              linkToDetail={false}
              perfume={perfume}
            />
          ))}
        </div>
      </section>

      <section className="final-cta section-shell">
        <p className="folio-label">A new chapter / Start with what you know</p>
        <h2>Your next signature may begin with a single note.</h2>
        <Link className="button button--light" to="/discover">
          Discover your matches
        </Link>
      </section>
    </>
  );
}
