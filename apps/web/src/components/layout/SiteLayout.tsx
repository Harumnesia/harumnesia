import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { EditorialIcon } from '../editorial/EditorialIcon.js';
import { useRecommendationExperience } from '../../features/recommendation/useRecommendationExperience.js';

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const { results, status } = useRecommendationExperience();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isDiscovery = location.pathname === '/discover';
  const isDetail = location.pathname.startsWith('/perfume/');

  useEffect(() => {
    if (location.hash) {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash, location.key]);

  return (
    <div
      className={
        isLanding
          ? 'site-shell site-shell--landing'
          : 'site-shell site-shell--editorial'
      }
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header
        className="site-header"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <div className="site-header__inner">
          <NavLink
            className="wordmark"
            to="/"
            onClick={() => setMenuOpen(false)}
          >
            <EditorialIcon name="leaf" /> Harumnesia
          </NavLink>
          <button
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
            ref={menuButton}
          >
            <EditorialIcon name={menuOpen ? 'close' : 'menu'} />
            <span className="sr-only">Toggle navigation</span>
          </button>
          <nav
            aria-label="Primary navigation"
            className={menuOpen ? 'site-nav site-nav--open' : 'site-nav'}
            id="primary-navigation"
          >
            <NavLink to="/discover" onClick={() => setMenuOpen(false)}>
              Discover
            </NavLink>
            {!isLanding || (results && results.length > 0) ? (
              <NavLink to="/results" onClick={() => setMenuOpen(false)}>
                Results
              </NavLink>
            ) : null}
            <Link
              className="site-nav__notes"
              to="/#scent-notes"
              onClick={() => setMenuOpen(false)}
            >
              Notes
            </Link>
            <Link to="/#how-it-works" onClick={() => setMenuOpen(false)}>
              About
            </Link>
          </nav>
          {!isLanding ? (
            isDiscovery ? (
              <button
                className="site-header__action"
                disabled={status === 'submitting'}
                form="discovery-form"
                type="reset"
              >
                <EditorialIcon name="reset" /> Start over
              </button>
            ) : (
              <Link
                className="site-header__action"
                to={isDetail && results?.length ? '/results' : '/discover'}
              >
                <EditorialIcon name={isDetail ? 'arrow' : 'reset'} />
                {isDetail && results?.length
                  ? 'Back to results'
                  : isDetail
                    ? 'Discover your scent'
                    : 'Refine search'}
              </Link>
            )
          ) : null}
        </div>
      </header>
      <main id="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div>
          <p className="wordmark">Harumnesia</p>
          <p>A thoughtful path to fragrances that feel like you.</p>
        </div>
        <p>Curated in Indonesia · An olfactory monograph</p>
      </footer>
    </div>
  );
}
