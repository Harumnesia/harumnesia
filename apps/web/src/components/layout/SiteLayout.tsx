import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <NavLink
            className="wordmark"
            to="/"
            onClick={() => setMenuOpen(false)}
          >
            Harumnesia
          </NavLink>
          <button
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span aria-hidden="true">{menuOpen ? 'Close' : 'Menu'}</span>
            <span className="sr-only">Toggle navigation</span>
          </button>
          <nav
            aria-label="Primary navigation"
            className={menuOpen ? 'site-nav site-nav--open' : 'site-nav'}
            id="primary-navigation"
          >
            <NavLink to="/" onClick={() => setMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/discover" onClick={() => setMenuOpen(false)}>
              Discover
            </NavLink>
            <NavLink
              className="button button--small"
              to="/discover"
              onClick={() => setMenuOpen(false)}
            >
              Find your scent
            </NavLink>
          </nav>
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
