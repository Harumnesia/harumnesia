import type { RecommendationPerfume } from '@harumnesia/shared';
import type {
  RecommendationRequestInput,
  RecommendationResult,
} from '@harumnesia/recommender';

export type InitializationTiming = {
  fetchMs: number;
  parseMs: number;
  indexMs: number;
  totalMs: number;
  records: number;
};

export type RecommendWorkerData = {
  results: RecommendationResult[];
  recommendMs: number;
};

export type PerfumeWorkerData = {
  perfume: RecommendationPerfume | null;
  lookupMs: number;
};

export type WorkerRequest =
  | { id: string; type: 'init'; runtimeUrl: string }
  | {
      id: string;
      type: 'recommend';
      request: RecommendationRequestInput;
    }
  | { id: string; type: 'get-perfume'; perfumeId: string };

export type WorkerSuccessResponse =
  | { id: string; type: 'init'; ok: true; data: InitializationTiming }
  | { id: string; type: 'recommend'; ok: true; data: RecommendWorkerData }
  | { id: string; type: 'get-perfume'; ok: true; data: PerfumeWorkerData };

export type WorkerErrorResponse = {
  id: string;
  type: WorkerRequest['type'];
  ok: false;
  error: string;
};

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;
