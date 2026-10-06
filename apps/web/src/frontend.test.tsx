// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AppRoutes } from './App.js';
import { mockRecommendationService } from './features/recommendation/service.js';
import type {
  PerfumeDetailViewModel,
  RecommendationService,
} from './features/recommendation/types.js';
import { FIXTURE_DISCOVERY_TAXONOMY } from './fixtures/taxonomy.js';

afterEach(cleanup);
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

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
        name: /find a fragrance that feels like you/i,
        level: 1,
      }),
    ).not.toBeNull();
    expect(
      screen.getByRole('link', { name: 'Discover your scent' }),
    ).not.toBeNull();
  });

  it('provides a labelled navigation toggle for small screens', () => {
    renderRoute('/');
    const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('routes the hero action into the real discovery form', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    await user.click(screen.getByRole('link', { name: 'Discover your scent' }));
    expect(await screen.findByLabelText('Preferred notes')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('closes navigation with Escape and returns focus to its trigger', async () => {
    const user = userEvent.setup();
    renderRoute('/');
    const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    await user.keyboard('{Escape}');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
  });

  it('reflects live selections and resets preferences and firm boundaries', async () => {
    const user = userEvent.setup();
    renderRoute('/discover');
    const noteOptions = await screen.findByLabelText(
      'Suggested Preferred notes',
    );
    await user.click(
      within(noteOptions).getByRole('button', { name: 'vanilla' }),
    );
    const profile = screen.getByRole('region', { name: 'Your scent profile' });
    expect(within(profile).getByText('vanilla')).not.toBeNull();
    await user.click(screen.getByLabelText('Local'));
    await user.type(screen.getByLabelText('Maximum budget (IDR)'), '500000');
    await user.click(screen.getByText('Advanced filters'));
    const exclusions = screen.getByLabelText('Excluded notes').parentElement;
    if (!exclusions) throw new Error('Missing exclusion selector');
    await user.type(within(exclusions).getByRole('textbox'), 'amb{Enter}');
    await user.type(screen.getByLabelText('Preferred notes'), 'rose');
    await user.click(
      within(
        screen.getByRole('group', { name: 'Only these concentrations' }),
      ).getByLabelText('EDP'),
    );
    expect(within(profile).getByText(/Excluded notes: amber/)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.queryByRole('button', { name: 'Remove vanilla' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove amber' })).toBeNull();
    expect(
      (screen.getByLabelText('Preferred notes') as HTMLInputElement).value,
    ).toBe('');
    expect(
      (
        within(
          screen.getByRole('group', { name: 'Only these concentrations' }),
        ).getByLabelText('EDP') as HTMLInputElement
      ).checked,
    ).toBe(false);
    expect(
      (screen.getByLabelText('Maximum budget (IDR)') as HTMLInputElement).value,
    ).toBe('');
    expect(
      (screen.getByLabelText('All markets') as HTMLInputElement).checked,
    ).toBe(true);
    expect(within(profile).getByText('Local + International')).not.toBeNull();
  });

  it('shows real reasons on a recommended detail and retains editing selections', async () => {
    const user = userEvent.setup();
    renderRoute('/discover');
    const noteOptions = await screen.findByLabelText(
      'Suggested Preferred notes',
    );
    await user.click(
      within(noteOptions).getByRole('button', { name: 'vanilla' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Show my recommendations' }),
    );
    const results = await screen.findByRole('region', {
      name: 'Recommended fragrances',
    });
    await user.click(
      within(results).getAllByRole('link', { name: 'View details' })[0]!,
    );
    expect(
      await screen.findByRole('heading', { name: 'Senja di Ubud', level: 1 }),
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', { name: 'Why Harumnesia recommends this' }),
    ).not.toBeNull();
    expect(
      screen.getByText('Matches preferred notes: bergamot, amber'),
    ).not.toBeNull();
    await user.click(screen.getByRole('link', { name: 'Edit preferences' }));
    expect(
      await screen.findByRole('button', { name: 'Remove vanilla' }),
    ).not.toBeNull();
  });

  it('renders a semantic, labelled discovery form', async () => {
    renderRoute('/discover');
    expect(
      await screen.findByRole('heading', {
        name: /build your fragrance profile/i,
      }),
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

  it('uses the actual result count for a small recommendation pool', async () => {
    const service: RecommendationService = {
      recommend: async (request) =>
        (await mockRecommendationService.recommend(request)).slice(0, 1),
      getPerfume: mockRecommendationService.getPerfume,
    };
    const user = userEvent.setup();
    renderRoute('/discover', service);
    await user.click(
      await screen.findByRole('button', { name: 'Show my recommendations' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Top 1 fragrance for you.' }),
    ).not.toBeNull();
    expect(screen.getAllByRole('link', { name: 'View details' })).toHaveLength(
      1,
    );
  });

  it('omits unavailable note stages and personalized reasons on direct lookup', async () => {
    const perfume = await mockRecommendationService.getPerfume(
      'fixture-vanilla-archive',
    );
    if (!perfume) throw new Error('Missing detail fixture');
    const service: RecommendationService = {
      recommend: mockRecommendationService.recommend,
      getPerfume: async () => ({
        ...perfume,
        notes: { top: ['bergamot'], middle: [], base: [] },
      }),
    };
    renderRoute('/perfume/fixture-vanilla-archive', service);
    expect(
      await screen.findByRole('heading', { name: 'Top Notes' }),
    ).not.toBeNull();
    expect(screen.queryByRole('heading', { name: 'Middle Notes' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Base Notes' })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: 'Why Harumnesia recommends this' }),
    ).toBeNull();
    expect(screen.queryByText(/% match/)).toBeNull();
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
      screen.getByRole('heading', { name: /404 · off the trail/i }),
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
