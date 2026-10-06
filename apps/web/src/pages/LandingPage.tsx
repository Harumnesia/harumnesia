import { Link } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { DatasetStat } from '../components/editorial/DatasetStat.js';
import { LandingArtwork } from '../components/editorial/LandingArtwork.js';
import { EditorialIcon } from '../components/editorial/EditorialIcon.js';
import { PerfumeCard } from '../components/perfume/PerfumeCard.js';
import { MOCK_RECOMMENDATIONS } from '../fixtures/perfumes.js';
import './LandingPage.css';

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
      <section className="hero hero--canvas section-shell">
        <div className="hero__copy">
          <p className="folio-label">Scents for a more you</p>
          <h1>
            <span>Find a fragrance</span>{' '}
            <span>
              that feels like <em>you.</em>
            </span>
          </h1>
          <p className="lede">
            <span>An explainable perfume discovery experience</span>{' '}
            <span>guided by notes, accords, and occasion.</span>
          </p>
          <div className="button-row">
            <Link className="button" to="/discover">
              Discover your scent <EditorialIcon name="arrow" />
            </Link>
            <a className="button button--outline" href="#featured-fragrances">
              Explore fragrances
            </a>
          </div>
          <ul
            className="preference-chips hero__chips"
            aria-label="Scent directions to explore"
          >
            {['Vanilla', 'Amber', 'Bergamot', 'Woody', 'Iris'].map((scent) => (
              <li key={scent}>
                <EditorialIcon name="note" />
                <span>{scent}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hero__art">
          <LandingArtwork />
        </div>
        <DatasetStat />
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

      <section className="dimensions" id="scent-notes">
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

      <section className="featured section-shell" id="featured-fragrances">
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
