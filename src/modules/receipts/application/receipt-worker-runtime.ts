import { runQueuedReceiptJobs } from "./receipt-service";

export type ReceiptPollingWorkerOptions = { once?: boolean; batchSize?: number; idleDelayMs?: number; activeDelayMs?: number };

export async function drainReceiptJobs(batchSize = 5) {
  return runQueuedReceiptJobs(batchSize);
}

export async function runReceiptPollingWorker(options: ReceiptPollingWorkerOptions = {}) {
  const batchSize = options.batchSize ?? 5;
  do {
    const results = await drainReceiptJobs(batchSize);
    if (options.once) return results;
    await new Promise(resolve => setTimeout(resolve, results.length ? options.activeDelayMs ?? 500 : options.idleDelayMs ?? 2_000));
  } while (true);
}
