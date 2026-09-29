import { createContext } from 'react';

import type {
  DiscoveryFormState,
  RecommendationViewModel,
  SubmissionStatus,
} from './types.js';

export type RecommendationExperienceValue = {
  status: SubmissionStatus;
  results: RecommendationViewModel[] | null;
  lastForm: DiscoveryFormState;
  error: string | null;
  submit(form: DiscoveryFormState): Promise<boolean>;
};

export const RecommendationExperienceContext =
  createContext<RecommendationExperienceValue | null>(null);
