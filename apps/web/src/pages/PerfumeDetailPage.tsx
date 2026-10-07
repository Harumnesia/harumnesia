import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { SystemState } from '../components/SystemState.js';
import { PerfumeVisual } from '../components/perfume/PerfumeVisual.js';
import { NotesPyramid } from '../components/perfume/NotesPyramid.js';
import { MatchReasons } from '../components/perfume/MatchReasons.js';
import { ProfileSummary } from '../components/editorial/ProfileSummary.js';
import { EditorialIcon } from '../components/editorial/EditorialIcon.js';
import type { PerfumeDetailViewModel } from '../features/recommendation/types.js';
import { useRecommendationExperience } from '../features/recommendation/useRecommendationExperience.js';

type DetailState =
  | { status: 'loading' }
  | { status: 'success'; perfume: PerfumeDetailViewModel }
  | { status: 'not-found' }
  | { status: 'error' };

function PerfumeDetailLookup({ id }: { id: string | undefined }) {
  const { getPerfume, results, lastForm } = useRecommendationExperience();
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<DetailState>(
    id ? { status: 'loading' } : { status: 'not-found' },
  );

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      return;
    }

    void getPerfume(id)
      .then((perfume) => {
        if (cancelled) return;
        setState(
          perfume ? { status: 'success', perfume } : { status: 'not-found' },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [getPerfume, id, retryCount]);

  if (state.status === 'loading') {
    return (
      <SystemState
        title="Loading fragrance"
        eyebrow="Following the scent trail"
        heading="Finding that fragrance…"
        description="Preparing its notes and details."
        descriptionRole="status"
        loading
      />
    );
  }

  if (state.status === 'not-found') {
    return (
      <SystemState
        title="Fragrance not found"
        eyebrow="Lost on the scent trail"
        heading="We could not find that fragrance."
        description="The link may be outdated, or this fragrance is not currently available."
        tone="empty"
      >
        <Link className="button" to="/results">
          Browse the edit
        </Link>
      </SystemState>
    );
  }

  if (state.status === 'error') {
    return (
      <SystemState
        title="Unable to load fragrance"
        eyebrow="The scent trail was interrupted"
        heading="We could not load that fragrance."
        description="Please try again. Your recommendations are still available."
        descriptionRole="alert"
        tone="error"
      >
        <div className="button-row">
          <button
            className="button"
            onClick={() => {
              setState({ status: 'loading' });
              setRetryCount((count) => count + 1);
            }}
            type="button"
          >
            Try again
          </button>
          <Link className="text-link" to="/results">
            Back to recommendations
          </Link>
        </div>
      </SystemState>
    );
  }

  const { perfume } = state;
  const recommendation = results?.find((result) => result.id === perfume.id);
  const hasNotes = Object.values(perfume.notes).some(
    (stage) => stage.length > 0,
  );
  const isSparse = !recommendation?.reasons.length;
  const notesSection = hasNotes ? (
    <section aria-labelledby="notes-heading" className="dossier__notes">
      <div className="dossier__section-heading">
        <h2 id="notes-heading">The note pyramid</h2>
        <p>The fragrance journey</p>
      </div>
      <NotesPyramid notes={perfume.notes} />
    </section>
  ) : null;

  return (
    <>
      <PageTitle title={perfume.name} />
      <div className="dossier-heading section-shell">
        <span className="folio-label">Perfume detail</span>
        <Link
          className="text-link"
          to={results?.length ? '/results' : '/discover'}
        >
          <span aria-hidden="true">←</span>{' '}
          {results?.length ? 'Back to recommendations' : 'Discover your scent'}
        </Link>
      </div>
      <article
        className={`dossier section-shell${isSparse ? ' dossier--sparse' : ''}`}
      >
        <div className="dossier__visual-column">
          <div className="dossier__art">
            <PerfumeVisual
              perfumeId={perfume.id}
              perfumeName={perfume.name}
              sizes="(min-width: 48rem) 38vw, 100vw"
              tone={perfume.visualTone}
            />
            <div className="dossier__art-caption">
              {recommendation ? (
                <span className="match-label">
                  {recommendation.rank === 1
                    ? 'Top match'
                    : `Recommendation ${String(recommendation.rank).padStart(2, '0')}`}
                </span>
              ) : null}
              <span>
                {recommendation
                  ? 'From your fragrance edit'
                  : 'A visual study / Fragrance record'}
              </span>
            </div>
          </div>
          {!isSparse ? notesSection : null}
        </div>
        <div className="dossier__content-column">
          <div className="dossier__intro">
            <div className="dossier__title">
              <h1>{perfume.name}</h1>
            </div>
            <p className="dossier__brand">{perfume.brand}</p>
            <p className="lede">
              Explore the listed notes, accords, and occasions that define this
              fragrance record.
            </p>
            {perfume.accords.length > 0 ? (
              <ul className="tag-list" aria-label="Fragrance accords">
                {perfume.accords.slice(0, 5).map((accord) => (
                  <li key={accord}>{accord}</li>
                ))}
              </ul>
            ) : null}
            <dl className="dossier__facts">
              <div>
                <dt>
                  <EditorialIcon name="globe" />
                  Market
                </dt>
                <dd>{perfume.marketLabel}</dd>
              </div>
              <div>
                <dt>
                  <EditorialIcon name="leaf" />
                  Expression
                </dt>
                <dd>{perfume.genderLabel}</dd>
              </div>
              {perfume.concentration ? (
                <div>
                  <dt>
                    <EditorialIcon name="bottle" />
                    Concentration
                  </dt>
                  <dd>{perfume.concentration}</dd>
                </div>
              ) : null}
              {perfume.occasions.length > 0 ? (
                <div>
                  <dt>
                    <EditorialIcon name="moon" />
                    Occasions
                  </dt>
                  <dd>{perfume.occasions.join(' · ')}</dd>
                </div>
              ) : null}
              {perfume.priceLabel ? (
                <div>
                  <dt>
                    <EditorialIcon name="layers" />
                    Listed price
                  </dt>
                  <dd>{perfume.priceLabel}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="dossier__lower">
            {recommendation && recommendation.reasons.length > 0 ? (
              <div className="dossier__reasons">
                <MatchReasons
                  reasons={recommendation.reasons}
                  title="Why Harumnesia recommends this"
                />
              </div>
            ) : null}
            {perfume.accords.length > 0 ||
            perfume.occasions.length > 0 ||
            recommendation ? (
              <div className="dossier__character">
                {perfume.accords.length > 0 ? (
                  <section
                    aria-labelledby="accords-heading"
                    className="dossier__section"
                  >
                    <h2 id="accords-heading">Accords & character</h2>
                    <ul className="tag-list">
                      {perfume.accords.map((accord) => (
                        <li key={accord}>{accord}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {perfume.occasions.length > 0 ? (
                  <section
                    aria-labelledby="occasions-heading"
                    className="dossier__section"
                  >
                    <h2 id="occasions-heading">Occasions</h2>
                    <ul className="tag-list">
                      {perfume.occasions.map((occasion) => (
                        <li key={occasion}>{occasion}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {recommendation ? (
                  <ProfileSummary
                    form={lastForm}
                    title="Your profile alignment"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          {isSparse ? notesSection : null}
        </div>
      </article>
    </>
  );
}

export function PerfumeDetailPage() {
  const { id } = useParams();
  return <PerfumeDetailLookup id={id} key={id ?? 'missing'} />;
}
