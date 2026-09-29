import type { ScoringWeights } from './types.js';

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 20;

export const DEFAULT_SCORING_WEIGHTS: Readonly<ScoringWeights> = Object.freeze({
  notes: 0.55,
  accords: 0.2,
  gender: 0.1,
  occasion: 0.1,
  concentration: 0.05,
});

export const DEFAULT_MMR_LAMBDA = 0.85;
export const MIN_DIVERSIFICATION_POOL = 50;
export const DIVERSIFICATION_POOL_MULTIPLIER = 10;

export const REDUNDANCY_CHANNEL_WEIGHTS = Object.freeze({
  notes: 0.8,
  accords: 0.2,
});

export const MAX_REASONS = 3;
