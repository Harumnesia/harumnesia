import type { RecommendationPerfume } from '@harumnesia/shared';
import { createRecommender, type Recommender } from '@harumnesia/recommender';

import type {
  InitializationTiming,
  WorkerRequest,
  WorkerResponse,
} from './worker-protocol.js';

type RuntimeState = {
  dataset: readonly RecommendationPerfume[];
  recommender: Recommender;
  timing: InitializationTiming;
};

type WorkerScope = {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ): void;
  postMessage(message: WorkerResponse): void;
};

const workerScope = self as unknown as WorkerScope;
let runtimeState: RuntimeState | null = null;
let initializationPromise: Promise<RuntimeState> | null = null;

function elapsed(startedAt: number): number {
  return Number((performance.now() - startedAt).toFixed(2));
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown worker error.';
}

async function initialize(runtimeUrl: string): Promise<RuntimeState> {
  const totalStartedAt = performance.now();
  const fetchStartedAt = performance.now();
  const response = await fetch(runtimeUrl);
  if (!response.ok) {
    throw new Error(`Runtime dataset request failed (${response.status}).`);
  }
  const runtimeText = await response.text();
  const fetchMs = elapsed(fetchStartedAt);

  const parseStartedAt = performance.now();
  const parsedDataset = JSON.parse(runtimeText) as unknown;
  const parseMs = elapsed(parseStartedAt);

  const indexStartedAt = performance.now();
  const recommender = createRecommender(
    parsedDataset as readonly RecommendationPerfume[],
  );
  const indexMs = elapsed(indexStartedAt);
  const dataset = parsedDataset as readonly RecommendationPerfume[];

  return {
    dataset,
    recommender,
    timing: {
      fetchMs,
      parseMs,
      indexMs,
      totalMs: elapsed(totalStartedAt),
      records: dataset.length,
    },
  };
}

async function ensureInitialized(runtimeUrl: string): Promise<RuntimeState> {
  if (runtimeState) return runtimeState;
  initializationPromise ??= initialize(runtimeUrl);
  try {
    runtimeState = await initializationPromise;
    return runtimeState;
  } catch (error) {
    initializationPromise = null;
    runtimeState = null;
    throw error;
  }
}

workerScope.addEventListener('message', (event) => {
  const request = event.data;
  void (async () => {
    try {
      if (request.type === 'init') {
        const state = await ensureInitialized(request.runtimeUrl);
        workerScope.postMessage({
          id: request.id,
          type: request.type,
          ok: true,
          data: state.timing,
        });
        return;
      }

      if (!runtimeState) {
        throw new Error('Recommendation runtime is not initialized.');
      }

      if (request.type === 'recommend') {
        const startedAt = performance.now();
        const response = runtimeState.recommender.recommend(request.request);
        workerScope.postMessage({
          id: request.id,
          type: request.type,
          ok: true,
          data: {
            results: response.results,
            recommendMs: elapsed(startedAt),
          },
        });
        return;
      }

      const startedAt = performance.now();
      const perfume =
        runtimeState.dataset.find((item) => item.id === request.perfumeId) ??
        null;
      workerScope.postMessage({
        id: request.id,
        type: request.type,
        ok: true,
        data: { perfume, lookupMs: elapsed(startedAt) },
      });
    } catch (error) {
      workerScope.postMessage({
        id: request.id,
        type: request.type,
        ok: false,
        error: messageFromError(error),
      });
    }
  })();
});
