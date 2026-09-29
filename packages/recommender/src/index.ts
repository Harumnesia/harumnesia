export {
  DEFAULT_LIMIT,
  DEFAULT_MMR_LAMBDA,
  DEFAULT_SCORING_WEIGHTS,
  MAX_LIMIT,
} from './constants.js';
export { createRecommender } from './recommend.js';
export {
  RecommendationRequestSchema,
  RecommenderOptionsSchema,
} from './schema.js';
export type {
  RecommendationRequest,
  RecommendationRequestInput,
} from './schema.js';
export type {
  MatchedNote,
  NormalizedRequest,
  NoteStage,
  RecommendationComponents,
  RecommendationDiagnostics,
  RecommendationMatch,
  RecommendationResponse,
  RecommendationResult,
  Recommender,
  RecommenderOptions,
  RecommenderStats,
  ScoreComponent,
  ScoringSignal,
  ScoringWeights,
} from './types.js';

/** @deprecated Bootstrap compatibility marker; use createRecommender for runtime work. */
export const RECOMMENDER_PACKAGE_STATUS = 'ready' as const;
