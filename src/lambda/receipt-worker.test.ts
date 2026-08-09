import { describe, expect, it, vi } from "vitest";
import type { ReceiptObjectEventDependencies } from "@/modules/receipts/application/receipt-object-event";
import { createReceiptLambdaHandler, handleS3Event, type S3ObjectCreatedEvent } from "./receipt-worker";

const key = "receipts/store-1/2026/08/receipt-1/file-1.png";
function event(keys: string[]): S3ObjectCreatedEvent { return { Records: keys.map(value => ({ eventSource: "aws:s3", eventName: "ObjectCreated:Put", awsRegion: "ap-southeast-1", s3: { bucket: { name: "private-bucket" }, object: { key: encodeURIComponent(value) } } })) }; }
function dependencies(processJob: ReceiptObjectEventDependencies["processJob"]): ReceiptObjectEventDependencies {
  return { expectedBucket: "private-bucket", expectedPrefix: "receipts", findWork: vi.fn(async () => ({ storeId: "store-1", receiptId: "receipt-1", receiptStatus: "QUEUED", job: { id: "job-1", status: "QUEUED", nextRetryAt: null, startedAt: null } })), processJob };
}

describe("receipt Lambda handler", () => {
  it("never treats the AWS callback argument as receipt dependencies", async () => {
    const processJob = vi.fn(async () => ({ skipped: false, status: "REVIEW_READY" as const }));
    const lambdaHandler = createReceiptLambdaHandler(dependencies(processJob));
    const awsCallback = vi.fn();
    const result = await Reflect.apply(lambdaHandler, undefined, [event([key]), { awsRequestId: "request-callback" }, awsCallback]);
    expect(result).toMatchObject({ records: 1, processed: 1, ignored: 0, failed: 0 });
    expect(processJob).toHaveBeenCalledWith("job-1");
    expect(awsCallback).not.toHaveBeenCalled();
  });

  it("supports multiple records and duplicate delivery through the atomic processor", async () => {
    let claimed = false;
    const processJob = vi.fn(async () => { if (claimed) return { skipped: true }; claimed = true; return { skipped: false, status: "REVIEW_READY" as const }; });
    await expect(handleS3Event(event([key, key]), { awsRequestId: "request-1" }, dependencies(processJob))).resolves.toMatchObject({ records: 2, processed: 1, ignored: 1, failed: 0 });
    expect(processJob).toHaveBeenCalledTimes(2);
  });

  it("requests a batch retry for retryable failures after processing all records", async () => {
    const processJob = vi.fn(async () => { throw new Error("private provider error"); });
    await expect(handleS3Event(event([key, key]), { awsRequestId: "request-2" }, dependencies(processJob))).rejects.toThrow("RECEIPT_LAMBDA_BATCH_RETRY");
    expect(processJob).toHaveBeenCalledTimes(2);
  });

  it("requests another S3 delivery when the durable job schedules a transient retry", async () => {
    await expect(handleS3Event(event([key]), {}, dependencies(vi.fn(async () => ({ skipped: false, status: "QUEUED" as const }))))).rejects.toThrow("RECEIPT_LAMBDA_BATCH_RETRY");
  });

  it("ignores non-created and malformed records", async () => {
    const input: S3ObjectCreatedEvent = { Records: [{ eventSource: "aws:s3", eventName: "ObjectRemoved:Delete" }, { eventSource: "aws:s3", eventName: "ObjectCreated:Put", s3: {} }] };
    await expect(handleS3Event(input, {}, dependencies(vi.fn()))).resolves.toMatchObject({ records: 2, ignored: 2, failed: 0 });
  });
});
