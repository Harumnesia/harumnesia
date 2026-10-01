import { Link } from 'react-router-dom';

import { SystemState } from '../components/SystemState.js';

export function NotFoundPage() {
  return (
    <SystemState
      title="Page not found"
      eyebrow="Unknown folio"
      heading="404 · Off the trail"
      description="This page has faded away. Return home or begin a new fragrance discovery."
      tone="empty"
    >
      <div className="button-row">
        <Link className="button" to="/">
          Return home
        </Link>
        <Link className="text-link" to="/discover">
          Begin discovery
        </Link>
      </div>
    </SystemState>
  );
}
