import { describe, expect, it } from 'vitest';

import {
  RecommendationWorkerClient,
  type WorkerLike,
} from './worker-client.js';
import type {
  InitializationTiming,
  WorkerRequest,
  WorkerResponse,
} from './worker-protocol.js';

const INIT_TIMING: InitializationTiming = {
  fetchMs: 10,
  parseMs: 20,
  indexMs: 30,
  totalMs: 60,
  records: 25_127,
};

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  readonly messages: WorkerRequest[] = [];
  terminated = false;

  postMessage(message: WorkerRequest): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(response: WorkerResponse): void {
    this.onmessage?.({ data: response } as MessageEvent<WorkerResponse>);
  }
}

async function flushMessages() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('RecommendationWorkerClient', () => {
  it('deduplicates initialization and correlates concurrent responses by id', async () => {
    const worker = new FakeWorker();
    const client = new RecommendationWorkerClient(
      '/runtime.json',
      () => worker,
    );
    const first = client.recommend({ preferences: { notes: ['amber'] } });
    const second = client.recommend({ preferences: { notes: ['rose'] } });

    expect(worker.messages).toHaveLength(1);
    const init = worker.messages[0]!;
    expect(init.type).toBe('init');
    worker.respond({
      id: init.id,
      type: 'init',
      ok: true,
      data: INIT_TIMING,
    });
    await flushMessages();

    const recommendations = worker.messages.filter(
      (message) => message.type === 'recommend',
    );
    expect(recommendations).toHaveLength(2);
    const firstRequest = recommendations[0]!;
    const secondRequest = recommendations[1]!;
    worker.respond({
      id: secondRequest.id,
      type: 'recommend',
      ok: true,
      data: { results: [], recommendMs: 22 },
    });
    worker.respond({
      id: firstRequest.id,
      type: 'recommend',
      ok: true,
      data: { results: [], recommendMs: 11 },
    });

    expect((await first).recommendMs).toBe(11);
    expect((await second).recommendMs).toBe(22);
    expect(
      worker.messages.filter((message) => message.type === 'init'),
    ).toHaveLength(1);
  });

  it('resets a failed initialization so a later call can retry', async () => {
    const workers: FakeWorker[] = [];
    const client = new RecommendationWorkerClient('/runtime.json', () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });

    const failed = client.ensureInitialized();
    const firstInit = workers[0]!.messages[0]!;
    workers[0]!.respond({
      id: firstInit.id,
      type: 'init',
      ok: false,
      error: 'network failure',
    });
    await expect(failed).rejects.toThrow('network failure');
    expect(workers[0]?.terminated).toBe(true);

    const retried = client.ensureInitialized();
    const secondInit = workers[1]!.messages[0]!;
    workers[1]!.respond({
      id: secondInit.id,
      type: 'init',
      ok: true,
      data: INIT_TIMING,
    });
    await expect(retried).resolves.toEqual(INIT_TIMING);
    expect(workers).toHaveLength(2);
  });
});
