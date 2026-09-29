import { createContext } from 'react';

import type {
  DiscoveryFormState,
  PerfumeDetailViewModel,
  RecommendationViewModel,
  SubmissionStatus,
} from './types.js';

export type RecommendationExperienceValue = {
  status: SubmissionStatus;
  results: RecommendationViewModel[] | null;
  lastForm: DiscoveryFormState;
  error: string | null;
  submit(form: DiscoveryFormState): Promise<boolean>;
  getPerfume(id: string): Promise<PerfumeDetailViewModel | null>;
};

export const RecommendationExperienceContext =
  createContext<RecommendationExperienceValue | null>(null);
