import { Link } from 'react-router-dom';

import { PageTitle } from '../components/PageTitle.js';

export function NotFoundPage() {
  return (
    <section className="empty-state section-shell section-shell--narrow">
      <PageTitle title="Page not found" />
      <p className="eyebrow">404 · Off the trail</p>
      <h1>This page has faded away.</h1>
      <p className="lede">Return home or begin a new fragrance discovery.</p>
      <div className="button-row">
        <Link className="button" to="/">
          Return home
        </Link>
        <Link className="text-link" to="/discover">
          Begin discovery
        </Link>
      </div>
    </section>
  );
}
