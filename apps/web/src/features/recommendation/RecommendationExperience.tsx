import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import {
  RecommendationExperienceContext,
  type RecommendationExperienceValue,
} from './context.js';
import { toRecommendationRequest } from './form.js';
import { productionRecommendationService } from './runtime/production-service.js';
import {
  INITIAL_DISCOVERY_FORM,
  type DiscoveryFormState,
  type RecommendationService,
  type RecommendationViewModel,
  type SubmissionStatus,
} from './types.js';

type ProviderProps = PropsWithChildren<{
  service?: RecommendationService;
}>;

export function RecommendationExperienceProvider({
  children,
  service = productionRecommendationService,
}: ProviderProps) {
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [results, setResults] = useState<RecommendationViewModel[] | null>(
    null,
  );
  const [lastForm, setLastForm] = useState<DiscoveryFormState>(
    INITIAL_DISCOVERY_FORM,
  );
  const [error, setError] = useState<string | null>(null);

  const getPerfume = useCallback(
    (id: string) => service.getPerfume(id),
    [service],
  );

  const submit = useCallback(
    async (form: DiscoveryFormState) => {
      setLastForm(form);
      setStatus('submitting');
      setError(null);
      try {
        const nextResults = await service.recommend(
          toRecommendationRequest(form),
        );
        setResults(nextResults);
        setStatus('success');
        return true;
      } catch {
        setStatus('error');
        setError('We could not prepare recommendations. Please try again.');
        return false;
      }
    },
    [service],
  );

  const value = useMemo<RecommendationExperienceValue>(
    () => ({
      status,
      results,
      lastForm,
      error,
      getPerfume,
      submit,
    }),
    [error, getPerfume, lastForm, results, status, submit],
  );

  return (
    <RecommendationExperienceContext.Provider value={value}>
      {children}
    </RecommendationExperienceContext.Provider>
  );
}
