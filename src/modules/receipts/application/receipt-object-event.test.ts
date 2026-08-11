import { describe, expect, it, vi } from "vitest";
import { decodeS3ObjectKey, processReceiptObjectEvent, ReceiptObjectEventError, type ReceiptObjectEventDependencies } from "./receipt-object-event";

const key = "receipts/store-1/2026/08/receipt-1/file-1.png";
const baseWork = { storeId: "store-1", receiptId: "receipt-1", receiptStatus: "QUEUED", job: { id: "job-1", status: "QUEUED", nextRetryAt: null, startedAt: null } };
function dependencies(overrides: Partial<ReceiptObjectEventDependencies> = {}): ReceiptObjectEventDependencies {
  return { expectedBucket: "private-bucket", expectedPrefix: "receipts", findWork: vi.fn(async () => baseWork), processJob: vi.fn(async () => ({ skipped: false, status: "REVIEW_READY" as const })), ...overrides };
}

describe("receipt S3 object events", () => {
  it("decodes URL-encoded keys and processes the matching queued job", async () => {
    expect(decodeS3ObjectKey("receipts%2Fstore-1%2Ffile+name.png")).toBe("receipts/store-1/file name.png");
    const deps = dependencies();
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: encodeURIComponent(key) }, deps)).resolves.toMatchObject({ status: "PROCESSED", receiptId: "receipt-1", jobId: "job-1" });
    expect(deps.findWork).toHaveBeenCalledWith(key);
    expect(deps.processJob).toHaveBeenCalledWith("job-1");
  });

  it("ignores wrong buckets, prefixes, and missing database files", async () => {
    const deps = dependencies({ findWork: vi.fn(async () => null) });
    await expect(processReceiptObjectEvent({ bucket: "other-bucket", encodedObjectKey: key }, deps)).resolves.toMatchObject({ status: "IGNORED_WRONG_BUCKET" });
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: "other/store-1/file.png" }, deps)).resolves.toMatchObject({ status: "IGNORED_WRONG_PREFIX" });
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, deps)).resolves.toMatchObject({ status: "IGNORED_MISSING_FILE" });
  });

  it("rejects malformed and cross-store keys without exposing the key", async () => {
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: "%E0%A4%A" }, dependencies())).rejects.toMatchObject({ code: "INVALID_OBJECT_EVENT_KEY", retryable: false, message: "INVALID_OBJECT_EVENT_KEY" });
    const deps = dependencies({ findWork: vi.fn(async () => ({ ...baseWork, storeId: "store-2" })) });
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, deps)).rejects.toMatchObject({ code: "CROSS_STORE_OBJECT_KEY", retryable: false });
  });

  it("handles missing, running, completed, failed, and deferred jobs idempotently", async () => {
    const cases = [
      [{ ...baseWork, job: null }, ReceiptObjectEventError],
      [{ ...baseWork, receiptStatus: "REVIEW_READY", job: { ...baseWork.job, status: "SUCCEEDED" } }, "ALREADY_COMPLETED"],
      [{ ...baseWork, job: { ...baseWork.job, status: "FAILED" } }, "ALREADY_FAILED"],
      [{ ...baseWork, job: { ...baseWork.job, nextRetryAt: new Date(Date.now() + 60_000) } }, "DEFERRED"],
    ] as const;
    for (const [work, expected] of cases) {
      const promise = processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies({ findWork: vi.fn(async () => work) }));
      if (expected === ReceiptObjectEventError) await expect(promise).rejects.toMatchObject({ code: "RECEIPT_JOB_NOT_READY", retryable: true });
      else await expect(promise).resolves.toMatchObject({ status: expected });
    }
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies({ findWork: vi.fn(async () => ({ ...baseWork, job: { ...baseWork.job, status: "RUNNING", startedAt: new Date() } })), processJob: vi.fn(async () => ({ skipped: true })) }))).resolves.toMatchObject({ status: "ALREADY_CLAIMED" });
  });

  it("preserves processing outcomes for Azure success, safe failure, and retryable infrastructure failure", async () => {
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies())).resolves.toMatchObject({ status: "PROCESSED" });
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies({ processJob: vi.fn(async () => ({ skipped: false, status: "FAILED" as const })) }))).resolves.toMatchObject({ status: "ALREADY_FAILED" });
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies({ processJob: vi.fn(async () => { throw new Error("provider detail must not escape"); }) }))).rejects.toMatchObject({ code: "RECEIPT_EVENT_PROCESSING_FAILED", message: "RECEIPT_EVENT_PROCESSING_FAILED", retryable: true });
  });

  it("notifies receipt-ready and final-failure states without changing the worker outcome", async () => {
    const readyNotify = vi.fn(async () => ({ sent: 1 }));
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies({ notifyStatus: readyNotify }))).resolves.toMatchObject({ status: "PROCESSED" });
    expect(readyNotify).toHaveBeenCalledWith("receipt-1", "REVIEW_READY");

    const failedNotify = vi.fn(async () => ({ sent: 1 }));
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies({ processJob: vi.fn(async () => ({ skipped: false, status: "FAILED" as const })), notifyStatus: failedNotify }))).resolves.toMatchObject({ status: "ALREADY_FAILED" });
    expect(failedNotify).toHaveBeenCalledWith("receipt-1", "FAILED");

    const brokenNotify = vi.fn(async () => { throw new Error("email provider down"); });
    await expect(processReceiptObjectEvent({ bucket: "private-bucket", encodedObjectKey: key }, dependencies({ notifyStatus: brokenNotify }))).resolves.toMatchObject({ status: "PROCESSED" });
  });
});
