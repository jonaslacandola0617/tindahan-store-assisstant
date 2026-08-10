import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";
import { assertReceiptObjectKey, receiptObjectPrefix } from "@/platform/storage/receipt-storage";
import { sendReceiptStatusAlert } from "@/modules/operating-view/application/operational-email";
import { processReceiptJob } from "./receipt-service";

export type ReceiptObjectEventInput = { bucket: string; encodedObjectKey: string };
export type ReceiptObjectEventResult = {
  status: "PROCESSED" | "DEFERRED" | "ALREADY_COMPLETED" | "ALREADY_CLAIMED" | "ALREADY_FAILED" | "IGNORED_WRONG_BUCKET" | "IGNORED_WRONG_PREFIX" | "IGNORED_MISSING_FILE";
  receiptId?: string;
  jobId?: string;
};

type ReceiptWork = {
  storeId: string;
  receiptId: string;
  receiptStatus: string;
  job: { id: string; status: string; nextRetryAt: Date | null; startedAt: Date | null } | null;
};

export type ReceiptObjectEventDependencies = {
  expectedBucket: string;
  expectedPrefix: string;
  findWork(objectKey: string): Promise<ReceiptWork | null>;
  processJob(jobId: string): Promise<{ skipped: boolean; status?: "REVIEW_READY" | "FAILED" | "QUEUED" }>;
  notifyStatus?(receiptId: string, status: "REVIEW_READY" | "FAILED"): Promise<unknown>;
};

export class ReceiptObjectEventError extends Error {
  constructor(readonly code: "INVALID_OBJECT_EVENT_KEY" | "CROSS_STORE_OBJECT_KEY" | "RECEIPT_JOB_NOT_READY" | "RECEIPT_EVENT_PROCESSING_FAILED", readonly retryable: boolean) {
    super(code);
    this.name = "ReceiptObjectEventError";
  }
}

export function decodeS3ObjectKey(encodedObjectKey: string) {
  try { return decodeURIComponent(encodedObjectKey.replace(/\+/g, " ")); }
  catch { throw new ReceiptObjectEventError("INVALID_OBJECT_EVENT_KEY", false); }
}

async function notifyReceiptStatus(dependencies: ReceiptObjectEventDependencies, receiptId: string, status: "REVIEW_READY" | "FAILED") {
  try { await dependencies.notifyStatus?.(receiptId, status); }
  catch { /* Email delivery must never change receipt processing outcome. */ }
}

const defaultDependencies = (): ReceiptObjectEventDependencies => ({
  expectedBucket: serverEnvironment.RECEIPT_S3_BUCKET!,
  expectedPrefix: receiptObjectPrefix(),
  async findWork(objectKey) {
    const file = await database().receiptFile.findUnique({
      where: { objectKey },
      select: {
        storeId: true,
        receiptId: true,
        receipt: { select: { status: true, jobRuns: { where: { jobType: "PREPARE_RECEIPT" }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, nextRetryAt: true, startedAt: true } } } },
      },
    });
    if (!file) return null;
    return { storeId: file.storeId, receiptId: file.receiptId, receiptStatus: file.receipt.status, job: file.receipt.jobRuns[0] ?? null };
  },
  processJob: processReceiptJob,
  notifyStatus: sendReceiptStatusAlert,
});

export async function processReceiptObjectEvent(input: ReceiptObjectEventInput, dependencies: ReceiptObjectEventDependencies = defaultDependencies()): Promise<ReceiptObjectEventResult> {
  if (input.bucket !== dependencies.expectedBucket) return { status: "IGNORED_WRONG_BUCKET" };
  const objectKey = decodeS3ObjectKey(input.encodedObjectKey);
  if (!objectKey.startsWith(`${dependencies.expectedPrefix}/`)) return { status: "IGNORED_WRONG_PREFIX" };
  try { assertReceiptObjectKey(objectKey); } catch { throw new ReceiptObjectEventError("INVALID_OBJECT_EVENT_KEY", false); }
  const work = await dependencies.findWork(objectKey);
  if (!work) return { status: "IGNORED_MISSING_FILE" };
  try { assertReceiptObjectKey(objectKey, work.storeId); } catch { throw new ReceiptObjectEventError("CROSS_STORE_OBJECT_KEY", false); }
  if (work.receiptStatus === "REVIEW_READY") {
    await notifyReceiptStatus(dependencies, work.receiptId, "REVIEW_READY");
    return { status: "ALREADY_COMPLETED", receiptId: work.receiptId, jobId: work.job?.id };
  }
  if (["CONFIRMED", "REVERSED"].includes(work.receiptStatus) || work.job?.status === "SUCCEEDED") return { status: "ALREADY_COMPLETED", receiptId: work.receiptId, jobId: work.job?.id };
  if (!work.job) throw new ReceiptObjectEventError("RECEIPT_JOB_NOT_READY", true);
  if (work.job.status === "FAILED") {
    await notifyReceiptStatus(dependencies, work.receiptId, "FAILED");
    return { status: "ALREADY_FAILED", receiptId: work.receiptId, jobId: work.job.id };
  }
  if (work.job.nextRetryAt && work.job.nextRetryAt > new Date()) return { status: "DEFERRED", receiptId: work.receiptId, jobId: work.job.id };
  try {
    const result = await dependencies.processJob(work.job.id);
    if (result.skipped) return { status: "ALREADY_CLAIMED", receiptId: work.receiptId, jobId: work.job.id };
    if (result.status === "REVIEW_READY") {
      await notifyReceiptStatus(dependencies, work.receiptId, "REVIEW_READY");
      return { status: "PROCESSED", receiptId: work.receiptId, jobId: work.job.id };
    }
    if (result.status === "QUEUED") return { status: "DEFERRED", receiptId: work.receiptId, jobId: work.job.id };
    await notifyReceiptStatus(dependencies, work.receiptId, "FAILED");
    return { status: "ALREADY_FAILED", receiptId: work.receiptId, jobId: work.job.id };
  } catch {
    throw new ReceiptObjectEventError("RECEIPT_EVENT_PROCESSING_FAILED", true);
  }
}
