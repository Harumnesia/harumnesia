import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
import { SystemState } from '../components/SystemState.js';
import { PerfumeVisual } from '../components/perfume/PerfumeVisual.js';
import type { PerfumeDetailViewModel } from '../features/recommendation/types.js';
import { useRecommendationExperience } from '../features/recommendation/useRecommendationExperience.js';

type DetailState =
  | { status: 'loading' }
  | { status: 'success'; perfume: PerfumeDetailViewModel }
  | { status: 'not-found' }
  | { status: 'error' };

function NotePyramid({ notes }: Pick<PerfumeDetailViewModel, 'notes'>) {
  const layers = [
    ['Top', notes.top],
    ['Middle', notes.middle],
    ['Base', notes.base],
  ] as const;

  return (
    <div className="note-pyramid">
      {layers.map(([label, values]) => (
        <div className="note-pyramid__tier" key={label}>
          <span className="note-pyramid__index" aria-hidden="true">
            {label === 'Top' ? '01' : label === 'Middle' ? '02' : '03'}
          </span>
          <h3>{label} Notes</h3>
          <p>{values.length > 0 ? values.join(' · ') : 'Not listed'}</p>
        </div>
      ))}
    </div>
  );
}

function PerfumeDetailLookup({ id }: { id: string | undefined }) {
  const { getPerfume } = useRecommendationExperience();
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

  return (
    <>
      <PageTitle title={perfume.name} />
      <div className="detail-heading section-shell">
        <Link className="text-link" to="/results">
          <span aria-hidden="true">←</span> Back to recommendations
        </Link>
        <span className="folio-label">
          Fragrance monograph / {perfume.marketLabel}
        </span>
      </div>
      <article className="detail section-shell">
        <div className="detail__art">
          <PerfumeVisual
            perfumeId={perfume.id}
            perfumeName={perfume.name}
            sizes="(min-width: 48rem) 38vw, 100vw"
            tone={perfume.visualTone}
          />
          <p className="detail__art-caption">
            Fig. 01 / Abstract fragrance study
          </p>
        </div>
        <div className="detail__content">
          <p className="eyebrow">
            <span>{perfume.brand}</span> / Fragrance record
          </p>
          <h1>{perfume.name}</h1>
          <p className="metadata">
            {perfume.marketLabel} · {perfume.genderLabel}
            {perfume.concentration ? ` · ${perfume.concentration}` : ''}
          </p>
          {perfume.priceLabel ? (
            <p className="detail__price">
              <span>Listed price</span>
              {perfume.priceLabel}
            </p>
          ) : null}
          <p className="detail__intro">
            Explore the listed notes, accords, and occasions that define this
            fragrance record.
          </p>
          <div className="detail__facts">
            <div>
              <span>Market</span>
              <strong>{perfume.marketLabel}</strong>
            </div>
            <div>
              <span>Expression</span>
              <strong>{perfume.genderLabel}</strong>
            </div>
            {perfume.concentration ? (
              <div>
                <span>Concentration</span>
                <strong>{perfume.concentration}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </article>
      <section
        aria-labelledby="notes-heading"
        className="detail-notes section-shell"
      >
        <div className="detail-notes__heading">
          <p className="folio-label">02 / Composition</p>
          <h2 id="notes-heading">The note pyramid</h2>
          <p>Top, middle, and base notes as listed for this fragrance.</p>
        </div>
        <NotePyramid notes={perfume.notes} />
      </section>
      {perfume.accords.length > 0 || perfume.occasions.length > 0 ? (
        <div className="detail-addenda section-shell">
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
          {perfume.occasions.length > 0 ? (
            <section
              aria-labelledby="occasions-heading"
              className="detail-section"
            >
              <p className="eyebrow">Context</p>
              <h2 id="occasions-heading">Occasions</h2>
              <ul className="tag-list">
                {perfume.occasions.map((occasion) => (
                  <li key={occasion}>{occasion}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function PerfumeDetailPage() {
  const { id } = useParams();
  return <PerfumeDetailLookup id={id} key={id ?? 'missing'} />;
}
