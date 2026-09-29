// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AppRoutes } from './App.js';
import { mockRecommendationService } from './features/recommendation/service.js';
import type {
  PerfumeDetailViewModel,
  RecommendationService,
} from './features/recommendation/types.js';
import { FIXTURE_DISCOVERY_TAXONOMY } from './fixtures/taxonomy.js';

afterEach(cleanup);

const loadFixtureTaxonomy = async () => FIXTURE_DISCOVERY_TAXONOMY;

function renderRoute(
  path: string,
  service: RecommendationService = mockRecommendationService,
  taxonomyLoader = loadFixtureTaxonomy,
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes service={service} taxonomyLoader={taxonomyLoader} />
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

  it('renders a semantic, labelled discovery form', async () => {
    renderRoute('/discover');
    expect(
      await screen.findByRole('heading', { name: /what would you like/i }),
    ).not.toBeNull();
    expect(screen.getByLabelText('Preferred notes')).not.toBeNull();
    expect(screen.getByText('Advanced filters')).not.toBeNull();
  });

  it('adds and removes controlled note selections', async () => {
    const user = userEvent.setup();
    renderRoute('/discover');
    const noteSelector = (await screen.findByLabelText('Preferred notes'))
      .parentElement;
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
      await screen.findByRole('button', { name: /show my recommendations/i }),
    );
    expect(
      await screen.findByRole('heading', { name: /5 fragrances/i }),
    ).not.toBeNull();
  });

  it('renders a useful empty-result state', async () => {
    const emptyService: RecommendationService = {
      recommend: async () => [],
      getPerfume: async () => null,
    };
    const user = userEvent.setup();
    renderRoute('/discover', emptyService);
    await user.click(
      await screen.findByRole('button', { name: /show my recommendations/i }),
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
      getPerfume: async () => null,
    };
    const user = userEvent.setup();
    renderRoute('/discover', errorService);
    await user.click(
      await screen.findByRole('button', { name: /show my recommendations/i }),
    );
    expect(await screen.findByRole('alert')).not.toBeNull();
  });

  it('does not present fixtures as results on direct navigation', () => {
    renderRoute('/results');
    expect(
      screen.getByRole('heading', { name: /start with your fragrance/i }),
    ).not.toBeNull();
    expect(screen.queryByText('Why it fits')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Start discovery' }),
    ).not.toBeNull();
  });

  it('renders human-readable match reasons without technical scores', async () => {
    const user = userEvent.setup();
    const { container } = renderRoute('/discover');
    await user.click(
      await screen.findByRole('button', { name: /show my recommendations/i }),
    );
    expect(
      await screen.findByText(/matches preferred notes: bergamot, amber/i),
    ).not.toBeNull();
    expect(container.textContent).not.toMatch(/mmr|similarity score/i);
  });

  it('renders a valid fragrance detail route and note pyramid', async () => {
    renderRoute('/perfume/fixture-senja-ubud');
    expect(
      await screen.findByRole('heading', { name: 'Senja di Ubud', level: 1 }),
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: 'The note pyramid' }),
    ).not.toBeNull();
    expect(screen.getByText('bergamot · citrus')).not.toBeNull();
  });

  it('omits unavailable detail metadata instead of showing broken values', async () => {
    const { container } = renderRoute('/perfume/fixture-vanilla-archive');
    await screen.findByRole('heading', { name: 'Vanilla Archive', level: 1 });
    expect(container.textContent).not.toMatch(/null|undefined/i);
    expect(screen.queryByRole('heading', { name: 'Occasions' })).toBeNull();
  });

  it('renders a non-fixture detail supplied by the service', async () => {
    const customDetail: PerfumeDetailViewModel = {
      id: 'local-hrmn-0001',
      name: 'Production Bloom',
      brand: 'Future Service',
      marketLabel: 'Local',
      genderLabel: 'Unisex',
      concentration: 'EDP',
      priceLabel: 'Rp 450.000',
      notes: {
        top: ['bergamot'],
        middle: ['jasmine'],
        base: ['sandalwood'],
      },
      accords: [],
      occasions: ['day'],
      visualTone: 'citrus',
    };
    const customService: RecommendationService = {
      recommend: async () => [],
      getPerfume: async (id) => (id === customDetail.id ? customDetail : null),
    };

    renderRoute('/perfume/local-hrmn-0001', customService);

    expect(
      await screen.findByRole('heading', {
        name: 'Production Bloom',
        level: 1,
      }),
    ).not.toBeNull();
    expect(screen.getByText('Future Service')).not.toBeNull();
  });

  it('renders the detail loading state while service lookup is pending', () => {
    const pendingService: RecommendationService = {
      recommend: async () => [],
      getPerfume: () => new Promise(() => undefined),
    };

    renderRoute('/perfume/local-pending', pendingService);

    expect(screen.getByRole('status').textContent).toMatch(/preparing/i);
    expect(
      screen.getByRole('heading', { name: /finding that fragrance/i }),
    ).not.toBeNull();
  });

  it('renders a recoverable detail service error', async () => {
    const errorService: RecommendationService = {
      recommend: async () => [],
      getPerfume: async () => {
        throw new Error('lookup failed');
      },
    };

    renderRoute('/perfume/local-error', errorService);

    expect(
      await screen.findByRole('heading', { name: /could not load/i }),
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).not.toBeNull();
  });

  it('handles an invalid fragrance id', async () => {
    renderRoute('/perfume/not-real');
    expect(
      await screen.findByRole('heading', { name: /could not find/i }),
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

  it('renders taxonomy loading and recoverable error states', async () => {
    const failingLoader = async () => {
      throw new Error('taxonomy unavailable');
    };
    renderRoute('/discover', mockRecommendationService, failingLoader);

    expect(screen.getByRole('status').textContent).toMatch(/gathering/i);
    expect(
      await screen.findByRole('heading', { name: /could not load/i }),
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).not.toBeNull();
  });
});
