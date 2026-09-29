import type { RecommendationRequestInput } from '@harumnesia/recommender';

import type {
  InitializationTiming,
  PerfumeWorkerData,
  RecommendWorkerData,
  WorkerRequest,
  WorkerResponse,
} from './worker-protocol.js';

export interface WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: WorkerRequest): void;
  terminate(): void;
}

type PendingRequest = {
  resolve(value: unknown): void;
  reject(reason: Error): void;
};

type WithoutRequestId<T> = T extends { id: string } ? Omit<T, 'id'> : never;
type WorkerRequestPayload = WithoutRequestId<WorkerRequest>;

export type WorkerFactory = () => WorkerLike;

function createBrowserWorker(): WorkerLike {
  return new Worker(new URL('./recommendation.worker.ts', import.meta.url), {
    type: 'module',
    name: 'harumnesia-recommender',
  });
}

export class RecommendationWorkerClient {
  readonly #runtimeUrl: string;
  readonly #workerFactory: WorkerFactory;
  readonly #pending = new Map<string, PendingRequest>();
  #worker: WorkerLike | null = null;
  #initializationPromise: Promise<InitializationTiming> | null = null;
  #requestSequence = 0;
  #initializationTiming: InitializationTiming | null = null;

  constructor(
    runtimeUrl: string,
    workerFactory: WorkerFactory = createBrowserWorker,
  ) {
    this.#runtimeUrl = runtimeUrl;
    this.#workerFactory = workerFactory;
  }

  get initializationTiming(): InitializationTiming | null {
    return this.#initializationTiming;
  }

  async recommend(
    request: RecommendationRequestInput,
  ): Promise<RecommendWorkerData> {
    await this.ensureInitialized();
    return this.#send<RecommendWorkerData>({ type: 'recommend', request });
  }

  async getPerfume(id: string): Promise<PerfumeWorkerData> {
    await this.ensureInitialized();
    return this.#send<PerfumeWorkerData>({
      type: 'get-perfume',
      perfumeId: id,
    });
  }

  ensureInitialized(): Promise<InitializationTiming> {
    this.#initializationPromise ??= this.#send<InitializationTiming>({
      type: 'init',
      runtimeUrl: this.#runtimeUrl,
    })
      .then((timing) => {
        this.#initializationTiming = timing;
        return timing;
      })
      .catch((error: unknown) => {
        const failure =
          error instanceof Error
            ? error
            : new Error('Worker initialization failed.');
        this.#reset(failure);
        throw failure;
      });
    return this.#initializationPromise;
  }

  dispose(): void {
    this.#reset(new Error('Recommendation worker was disposed.'));
  }

  #ensureWorker(): WorkerLike {
    if (this.#worker) return this.#worker;
    const worker = this.#workerFactory();
    worker.onmessage = (event) => this.#handleMessage(event.data);
    worker.onerror = (event) => {
      this.#reset(new Error(event.message || 'Recommendation worker failed.'));
    };
    worker.onmessageerror = () => {
      this.#reset(
        new Error('Recommendation worker returned an unreadable message.'),
      );
    };
    this.#worker = worker;
    return worker;
  }

  #send<T>(request: WorkerRequestPayload): Promise<T> {
    const id = `recommendation-${++this.#requestSequence}`;
    const message = { ...request, id } as WorkerRequest;
    return new Promise<T>((resolve, reject) => {
      this.#pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      try {
        this.#ensureWorker().postMessage(message);
      } catch (error) {
        this.#pending.delete(id);
        reject(
          error instanceof Error
            ? error
            : new Error('Unable to contact worker.'),
        );
      }
    });
  }

  #handleMessage(response: WorkerResponse): void {
    const pending = this.#pending.get(response.id);
    if (!pending) return;
    this.#pending.delete(response.id);
    if (response.ok) pending.resolve(response.data);
    else pending.reject(new Error(response.error));
  }

  #reset(error: Error): void {
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
    if (this.#worker) {
      this.#worker.onmessage = null;
      this.#worker.onerror = null;
      this.#worker.onmessageerror = null;
      this.#worker.terminate();
    }
    this.#worker = null;
    this.#initializationPromise = null;
    this.#initializationTiming = null;
  }
}
