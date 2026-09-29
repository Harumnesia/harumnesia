import type { RecommendationRequestInput } from '@harumnesia/recommender';

export type MarketChoice = 'all' | 'local' | 'international';

export type DiscoveryFormState = {
  preferredNotes: string[];
  preferredAccords: string[];
  preferredGenders: Array<'men' | 'women' | 'unisex'>;
  preferredOccasions: string[];
  preferredConcentrations: string[];
  market: MarketChoice;
  maxBudget: string;
  includeUnpriced: boolean;
  strictGenders: Array<'men' | 'women' | 'unisex'>;
  strictOccasions: string[];
  strictConcentrations: string[];
  excludedNotes: string[];
};

export const INITIAL_DISCOVERY_FORM: DiscoveryFormState = {
  preferredNotes: [],
  preferredAccords: [],
  preferredGenders: [],
  preferredOccasions: [],
  preferredConcentrations: [],
  market: 'all',
  maxBudget: '',
  includeUnpriced: true,
  strictGenders: [],
  strictOccasions: [],
  strictConcentrations: [],
  excludedNotes: [],
};

export type FragranceVisualTone =
  'amber' | 'rose' | 'forest' | 'citrus' | 'iris';

export type RecommendationViewModel = {
  id: string;
  rank: number;
  name: string;
  brand: string;
  marketLabel: string;
  genderLabel: string;
  concentration: string | null;
  priceLabel: string | null;
  keyNotes: string[];
  accords: string[];
  occasions: string[];
  reasons: string[];
  visualTone: FragranceVisualTone;
};

export interface RecommendationService {
  recommend(
    request: RecommendationRequestInput,
  ): Promise<RecommendationViewModel[]>;
}

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';
