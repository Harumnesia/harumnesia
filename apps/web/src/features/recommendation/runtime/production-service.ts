import type { RecommendationRequestInput } from '@harumnesia/recommender';

import type {
  PerfumeDetailViewModel,
  RecommendationService,
  RecommendationViewModel,
} from '../types.js';
import {
  toPerfumeDetailViewModel,
  toRecommendationViewModel,
} from '../view-model.js';
import { RUNTIME_DATA_URL } from './runtime-assets.js';
import { RecommendationWorkerClient } from './worker-client.js';
import type {
  InitializationTiming,
  PerfumeWorkerData,
  RecommendWorkerData,
} from './worker-protocol.js';

export interface RecommendationRuntimeClient {
  readonly initializationTiming: InitializationTiming | null;
  recommend(request: RecommendationRequestInput): Promise<RecommendWorkerData>;
  getPerfume(id: string): Promise<PerfumeWorkerData>;
}

export type ProductionIntegrationDiagnostics = {
  initialization: InitializationTiming | null;
  recommendationDurationsMs: number[];
  detailLookupDurationsMs: number[];
};

function recordMeasure(name: string, duration: number): void {
  if (typeof performance === 'undefined' || duration < 0) return;
  try {
    performance.measure(name, { start: 0, duration });
  } catch {
    // Performance diagnostics must never affect the recommendation flow.
  }
}

export class ProductionRecommendationService implements RecommendationService {
  readonly #client: RecommendationRuntimeClient;
  readonly #recommendationDurationsMs: number[] = [];
  readonly #detailLookupDurationsMs: number[] = [];
  #initializationMeasured = false;

  constructor(
    client: RecommendationRuntimeClient = new RecommendationWorkerClient(
      RUNTIME_DATA_URL,
    ),
  ) {
    this.#client = client;
  }

  async recommend(
    request: RecommendationRequestInput,
  ): Promise<RecommendationViewModel[]> {
    const response = await this.#client.recommend(request);
    this.#recordInitialization();
    this.#recommendationDurationsMs.push(response.recommendMs);
    recordMeasure('harumnesia:recommendation', response.recommendMs);
    return response.results.map(toRecommendationViewModel);
  }

  async getPerfume(id: string): Promise<PerfumeDetailViewModel | null> {
    const response = await this.#client.getPerfume(id);
    this.#recordInitialization();
    this.#detailLookupDurationsMs.push(response.lookupMs);
    recordMeasure('harumnesia:detail-lookup', response.lookupMs);
    return response.perfume ? toPerfumeDetailViewModel(response.perfume) : null;
  }

  getDiagnostics(): ProductionIntegrationDiagnostics {
    return {
      initialization: this.#client.initializationTiming,
      recommendationDurationsMs: [...this.#recommendationDurationsMs],
      detailLookupDurationsMs: [...this.#detailLookupDurationsMs],
    };
  }

  #recordInitialization(): void {
    if (this.#initializationMeasured) return;
    const timing = this.#client.initializationTiming;
    if (!timing) return;
    this.#initializationMeasured = true;
    recordMeasure('harumnesia:runtime-fetch', timing.fetchMs);
    recordMeasure('harumnesia:runtime-parse', timing.parseMs);
    recordMeasure('harumnesia:runtime-index', timing.indexMs);
    recordMeasure('harumnesia:runtime-initialization', timing.totalMs);
  }
}

export const productionRecommendationService =
  new ProductionRecommendationService();
