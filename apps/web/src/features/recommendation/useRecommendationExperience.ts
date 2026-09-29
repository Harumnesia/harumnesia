import { useContext } from 'react';

import {
  RecommendationExperienceContext,
  type RecommendationExperienceValue,
} from './context.js';

export function useRecommendationExperience(): RecommendationExperienceValue {
  const context = useContext(RecommendationExperienceContext);
  if (!context) {
    throw new Error(
      'useRecommendationExperience must be used inside its provider.',
    );
  }
  return context;
}
