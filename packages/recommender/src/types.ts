import type { Gender, RecommendationPerfume } from '@harumnesia/shared';

import type {
  RecommendationRequest,
  RecommendationRequestInput,
} from './schema.js';

export type ScoringSignal =
  'notes' | 'accords' | 'gender' | 'occasion' | 'concentration';

export type ScoringWeights = Record<ScoringSignal, number>;

export type RecommenderOptions = {
  weights?: Partial<ScoringWeights>;
  mmrLambda?: number;
};

export type ScoreComponent = {
  score: number;
  weight: number;
};

export type RecommendationComponents = Partial<
  Record<ScoringSignal, ScoreComponent>
>;

export type NoteStage = 'top' | 'middle' | 'base';

export type MatchedNote = {
  term: string;
  stages: NoteStage[];
};

export type RecommendationMatch = {
  notes: MatchedNote[];
  accords: string[];
  occasions: string[];
  concentration: string | null;
  gender: Exclude<Gender, 'unknown'> | null;
};

export type RecommendationResult = {
  id: string;
  rank: number;
  preDiversificationRank: number;
  score: number;
  coverage: number;
  mmrScore: number;
  components: RecommendationComponents;
  matched: RecommendationMatch;
  reasons: string[];
  perfume: RecommendationPerfume;
};

export type RecommendationDiagnostics = {
  totalPerfumes: number;
  survivingCandidates: number;
  diversificationPoolSize: number;
  requestedWeight: number;
  ignoredPreferences: {
    notes: string[];
    accords: string[];
  };
};

export type RecommendationResponse = {
  results: RecommendationResult[];
  diagnostics: RecommendationDiagnostics;
};

export type RecommenderStats = {
  perfumes: number;
  notesVocabulary: number;
  accordsVocabulary: number;
};

export type Recommender = {
  readonly stats: RecommenderStats;
  recommend(request?: RecommendationRequestInput): RecommendationResponse;
};

export type NormalizedRequest = RecommendationRequest;
