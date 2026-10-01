import type { ReactNode } from 'react';

import { PageTitle } from './PageTitle.js';

export function SystemState({
  title,
  eyebrow,
  heading,
  description,
  descriptionRole,
  loading = false,
  tone = 'neutral',
  children,
}: {
  title: string;
  eyebrow: string;
  heading: string;
  description: string;
  descriptionRole?: 'alert' | 'status';
  loading?: boolean;
  tone?: 'neutral' | 'error' | 'empty';
  children?: ReactNode;
}) {
  return (
    <section
      className={`system-state system-state--${tone} section-shell section-shell--narrow`}
    >
      <PageTitle title={title} />
      <div className="system-state__folio" aria-hidden="true">
        Harumnesia / Field note
      </div>
      <div className="system-state__panel">
        <div className="system-state__mark" aria-hidden="true">
          <span
            className={
              loading ? 'system-state__orbit is-loading' : 'system-state__orbit'
            }
          />
        </div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{heading}</h1>
        <p className="lede" role={descriptionRole}>
          {description}
        </p>
        {children ? (
          <div className="system-state__actions">{children}</div>
        ) : null}
      </div>
      <div className="system-state__foot" aria-hidden="true">
        A considered path through fragrance
      </div>
    </section>
  );
}
