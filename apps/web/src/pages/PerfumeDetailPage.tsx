import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';
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
        <div key={label}>
          <h3>{label}</h3>
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
      <section className="empty-state section-shell section-shell--narrow">
        <PageTitle title="Loading fragrance" />
        <p className="eyebrow">Following the scent trail</p>
        <h1>Finding that fragrance…</h1>
        <p className="lede" role="status">
          Preparing its notes and details.
        </p>
      </section>
    );
  }

  if (state.status === 'not-found') {
    return (
      <section className="empty-state section-shell section-shell--narrow">
        <PageTitle title="Fragrance not found" />
        <p className="eyebrow">Lost on the scent trail</p>
        <h1>We could not find that fragrance.</h1>
        <p className="lede">
          The link may be outdated, or this fragrance is not currently
          available.
        </p>
        <Link className="button" to="/results">
          Browse the edit
        </Link>
      </section>
    );
  }

  if (state.status === 'error') {
    return (
      <section className="empty-state section-shell section-shell--narrow">
        <PageTitle title="Unable to load fragrance" />
        <p className="eyebrow">The scent trail was interrupted</p>
        <h1>We could not load that fragrance.</h1>
        <p className="lede" role="alert">
          Please try again. Your recommendations are still available.
        </p>
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
      </section>
    );
  }

  const { perfume } = state;

  return (
    <>
      <PageTitle title={perfume.name} />
      <article className="detail section-shell">
        <div className="detail__art">
          <Link className="text-link" to="/results">
            <span aria-hidden="true">←</span> Back to recommendations
          </Link>
          <PerfumeVisual
            perfumeId={perfume.id}
            perfumeName={perfume.name}
            sizes="(min-width: 48rem) 38vw, 100vw"
            tone={perfume.visualTone}
          />
        </div>
        <div className="detail__content">
          <p className="eyebrow">{perfume.brand}</p>
          <h1>{perfume.name}</h1>
          <p className="metadata">
            {perfume.marketLabel} · {perfume.genderLabel}
            {perfume.concentration ? ` · ${perfume.concentration}` : ''}
          </p>
          {perfume.priceLabel ? (
            <p className="detail__price">{perfume.priceLabel}</p>
          ) : null}
          <p className="detail__intro">
            Explore the structure of this fragrance through its listed notes and
            character. Missing metadata is intentionally left unclaimed.
          </p>

          <section aria-labelledby="notes-heading" className="detail-section">
            <p className="eyebrow">Composition</p>
            <h2 id="notes-heading">The note pyramid</h2>
            <NotePyramid notes={perfume.notes} />
          </section>

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
              <p className="eyebrow">Best suited</p>
              <h2 id="occasions-heading">Occasions</h2>
              <ul className="tag-list">
                {perfume.occasions.map((occasion) => (
                  <li key={occasion}>{occasion}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}

export function PerfumeDetailPage() {
  const { id } = useParams();
  return <PerfumeDetailLookup id={id} key={id ?? 'missing'} />;
}
