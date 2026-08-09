import { logger } from "@/platform/logging/logger";
import { processReceiptObjectEvent, ReceiptObjectEventError, type ReceiptObjectEventDependencies } from "@/modules/receipts/application/receipt-object-event";

export type S3ObjectCreatedEvent = {
  Records: Array<{
    eventSource?: string;
    eventName?: string;
    awsRegion?: string;
    s3?: { bucket?: { name?: string }; object?: { key?: string } };
  }>;
};

type LambdaContext = { awsRequestId?: string };

export async function handleS3Event(event: S3ObjectCreatedEvent, context: LambdaContext = {}, dependencies?: ReceiptObjectEventDependencies) {
  if (!event || !Array.isArray(event.Records)) throw new Error("INVALID_S3_EVENT");
  const outcomes = await Promise.all(event.Records.map(async (record, recordIndex) => {
    if (record.eventSource !== "aws:s3" || !record.eventName?.startsWith("ObjectCreated:")) return { status: "IGNORED_EVENT_TYPE" as const };
    const bucket = record.s3?.bucket?.name;
    const encodedObjectKey = record.s3?.object?.key;
    if (!bucket || !encodedObjectKey) return { status: "IGNORED_MALFORMED_RECORD" as const };
    try {
      const result = await processReceiptObjectEvent({ bucket, encodedObjectKey }, dependencies);
      logger.info("receipt_lambda_record_completed", { requestId: context.awsRequestId, recordIndex, status: result.status, receiptId: result.receiptId, jobId: result.jobId });
      return result;
    } catch (error) {
      const code = error instanceof ReceiptObjectEventError ? error.code : "RECEIPT_EVENT_PROCESSING_FAILED";
      const retryable = !(error instanceof ReceiptObjectEventError) || error.retryable;
      logger.error("receipt_lambda_record_failed", { requestId: context.awsRequestId, recordIndex, failureType: code, retryable });
      return { status: "FAILED" as const, code, retryable };
    }
  }));
  const retryableFailures = outcomes.filter(outcome => (outcome.status === "FAILED" && outcome.retryable) || outcome.status === "DEFERRED");
  if (retryableFailures.length) throw new Error("RECEIPT_LAMBDA_BATCH_RETRY");
  return {
    records: outcomes.length,
    processed: outcomes.filter(outcome => outcome.status === "PROCESSED").length,
    deferred: outcomes.filter(outcome => outcome.status === "DEFERRED").length,
    failed: outcomes.filter(outcome => outcome.status === "FAILED").length,
    ignored: outcomes.filter(outcome => outcome.status.startsWith("IGNORED") || outcome.status.startsWith("ALREADY")).length,
  };
}

export function createReceiptLambdaHandler(dependencies?: ReceiptObjectEventDependencies) {
  // AWS supplies a third callback argument even for async handlers. Keep test
  // dependencies in this closure so that callback can never be mistaken for
  // the ReceiptObjectEventDependencies object.
  return (event: S3ObjectCreatedEvent, context: LambdaContext = {}) => handleS3Event(event, context, dependencies);
}

export const handler = createReceiptLambdaHandler();
