// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AppRoutes } from './App.js';
import type { RecommendationService } from './features/recommendation/types.js';

afterEach(cleanup);

function renderRoute(path: string, service?: RecommendationService) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes {...(service ? { service } : {})} />
    </MemoryRouter>,
  );
}

describe('frontend routes and states', () => {
  it('renders the landing page and primary call to action', () => {
    renderRoute('/');
    expect(
      screen.getByRole('heading', {
        name: /find a scent with a story/i,
        level: 1,
      }),
    ).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'Begin discovery' }),
    ).not.toBeNull();
  });

  it('provides a labelled navigation toggle for small screens', () => {
    renderRoute('/');
    const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders a semantic, labelled discovery form', () => {
    renderRoute('/discover');
    expect(
      screen.getByRole('heading', { name: /what would you like/i }),
    ).not.toBeNull();
    expect(screen.getByLabelText('Preferred notes')).not.toBeNull();
    expect(screen.getByText('Advanced filters')).not.toBeNull();
  });

  it('adds and removes controlled note selections', async () => {
    const user = userEvent.setup();
    renderRoute('/discover');
    const noteSelector = screen.getByLabelText('Preferred notes').parentElement;
    if (!noteSelector) throw new Error('Missing note selector');
    await user.type(within(noteSelector).getByRole('textbox'), 'amb{Enter}');
    expect(screen.getByRole('button', { name: 'Remove amber' })).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove amber' }));
    expect(screen.queryByRole('button', { name: 'Remove amber' })).toBeNull();
  });

  it('submits through the service and navigates to success results', async () => {
    const user = userEvent.setup();
    renderRoute('/discover');
    await user.click(
      screen.getByRole('button', { name: /show my recommendations/i }),
    );
    expect(
      await screen.findByRole('heading', { name: /5 fragrances/i }),
    ).not.toBeNull();
  });

  it('renders a useful empty-result state', async () => {
    const emptyService: RecommendationService = {
      recommend: async () => [],
    };
    const user = userEvent.setup();
    renderRoute('/discover', emptyService);
    await user.click(
      screen.getByRole('button', { name: /show my recommendations/i }),
    );
    expect(
      await screen.findByRole('heading', { name: /no fragrances met/i }),
    ).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Adjust filters' })).not.toBeNull();
  });

  it('renders a recoverable recommendation error', async () => {
    const errorService: RecommendationService = {
      recommend: async () => {
        throw new Error('fixture failure');
      },
    };
    const user = userEvent.setup();
    renderRoute('/discover', errorService);
    await user.click(
      screen.getByRole('button', { name: /show my recommendations/i }),
    );
    expect(await screen.findByRole('alert')).not.toBeNull();
  });

  it('supports direct results navigation with an explicit preview state', () => {
    renderRoute('/results');
    expect(screen.getByRole('status').textContent).toMatch(/preview edit/i);
    expect(screen.getAllByText('Why it fits')).toHaveLength(5);
  });

  it('renders human-readable match reasons without technical scores', () => {
    const { container } = renderRoute('/results');
    expect(
      screen.getByText(/matches preferred notes: bergamot, amber/i),
    ).not.toBeNull();
    expect(container.textContent).not.toMatch(/mmr|similarity score/i);
  });

  it('renders a valid fragrance detail route and note pyramid', () => {
    renderRoute('/perfume/fixture-senja-ubud');
    expect(
      screen.getByRole('heading', { name: 'Senja di Ubud', level: 1 }),
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: 'The note pyramid' }),
    ).not.toBeNull();
    expect(screen.getByText('bergamot · citrus')).not.toBeNull();
  });

  it('omits unavailable detail metadata instead of showing broken values', () => {
    const { container } = renderRoute('/perfume/fixture-vanilla-archive');
    expect(container.textContent).not.toMatch(/null|undefined/i);
    expect(screen.queryByRole('heading', { name: 'Occasions' })).toBeNull();
  });

  it('handles an invalid fragrance id', () => {
    renderRoute('/perfume/not-real');
    expect(
      screen.getByRole('heading', { name: /could not find/i }),
    ).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'Browse the edit' }),
    ).not.toBeNull();
  });

  it('handles an unknown application route', () => {
    renderRoute('/somewhere-else');
    expect(
      screen.getByRole('heading', { name: /page has faded away/i }),
    ).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Return home' })).not.toBeNull();
  });
});
