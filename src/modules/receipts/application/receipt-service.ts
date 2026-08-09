import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { createProduct } from "@/modules/inventory/application/inventory-service";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";
import { logger } from "@/platform/logging/logger";
import { createReceiptObjectKey, inspectReceiptImage, receiptStorage } from "@/platform/storage/receipt-storage";
import { consumeRateLimit } from "@/platform/security/rate-limit";
import { ReceiptError } from "./errors";
import { receiptExtractionProvider } from "../infrastructure/extraction-providers";
import { candidateReviewState, rankProductCandidates } from "../domain/matching";
import { isNonStockReceiptLine, normalizeBarcode, normalizeReceiptText, parsePeso, parseReceiptQuantity } from "../domain/normalization";
import { confirmationInput, receiptFilePolicy, rejectionInput, reviewChangeInput, reversalInput, unresolvedReceiptLines, validateReceiptFileMetadata } from "../domain/receipt";
import { requireReceiptAccess, requireReceiptOwner } from "./policy";
import { receiptRetryDelayMs } from "./retry-policy";
import { assertStoreMayWrite } from "@/modules/saas/application/saas-service";
import { SaasError } from "@/modules/saas/application/errors";

const uploadInput = z.object({ filename: z.string(), mimeType: z.string(), sizeBytes: z.coerce.number(), idempotencyKey: z.string().min(8).max(120) });
const historyInput = z.object({ status: z.enum(["all", "attention", "confirmed"]).default("all"), cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });
const createFromLineInput = z.object({ name: z.string().trim().min(1).max(160), category: z.string().trim().max(80).optional().nullable(), sellingUnit: z.string(), otherUnitRaw: z.string().trim().max(40).optional().nullable(), sellingPrice: z.coerce.number().min(0), lowStockThreshold: z.coerce.number().int().min(0).default(0), manufacturerBarcode: z.string().optional().nullable(), idempotencyKey: z.string().min(8).max(120) });

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function isTransactionConflict(error: unknown): boolean { const value = error as { code?: string; name?: string; message?: string; cause?: unknown }; return value.code === "P2034" || value.name === "TransactionWriteConflict" || /transactionwriteconflict|write conflict|deadlock/i.test(value.message ?? "") || (value.cause ? isTransactionConflict(value.cause) : false); }
function retryPause(attempt: number) { return new Promise(resolve => setTimeout(resolve, 30 * (attempt + 1))); }
function json(value: unknown) { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
export const receiptAtomicTransactionOptions = { isolationLevel: "Serializable" as const, maxWait: 10_000, timeout: 60_000 };
async function contextFor(userId: string, write = false) { const context = await resolveStoreContext(userId); if (!context) throw new ReceiptError("FORBIDDEN", "You do not have access to a store.", 403); requireReceiptAccess(context.role); if (write) try { await assertStoreMayWrite(context.store.id); } catch (error) { if (error instanceof SaasError) throw new ReceiptError(error.code, error.message, error.status); throw error; } return context; }
function publicFailure(code: string | undefined) { return code === "UNREADABLE_RECEIPT" ? "This photo is difficult to read. Retake it or review the items manually." : "We couldn't process this receipt. Try again or upload a clearer photo."; }

export async function initializeReceiptUpload(userId: string, origin: string, raw: unknown) {
  const rate = await consumeRateLimit("receipt-upload", userId, 20, 60_000);
  if (!rate.allowed) throw new ReceiptError("RATE_LIMITED", `Wait ${rate.retryAfterSeconds} seconds before starting another receipt.`, 429);
  const { store } = await contextFor(userId, true);
  const input = uploadInput.parse(raw);
  const file = validateReceiptFileMetadata(input);
  const requestHash = hash(file);
  const correlationId = randomUUID();
  const preference = await database().storePreference.findUnique({ where: { storeId: store.id }, select: { receiptRetentionDays: true } });
  const retentionDays = preference?.receiptRetentionDays ?? 2555;
  const prepared = await database().$transaction(async tx => {
    const prior = await tx.idempotencyKey.findUnique({ where: { storeId_scope_key: { storeId: store.id, scope: "INIT_RECEIPT_UPLOAD", key: input.idempotencyKey } } });
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ReceiptError("IDEMPOTENCY_CONFLICT", "This upload request was already used for a different photo.", 409);
      return prior.response as unknown as { receiptId: string; objectKey: string };
    }
    const receiptId = randomUUID();
    const objectKey = createReceiptObjectKey({ storeId: store.id, receiptId, fileId: randomUUID(), mimeType: file.mimeType });
    await tx.receipt.create({ data: { id: receiptId, storeId: store.id, createdById: userId, status: "UPLOADED", idempotencyKey: input.idempotencyKey, correlationId, file: { create: { storeId: store.id, objectKey, originalFilename: file.filename, mimeType: file.mimeType, sizeBytes: file.sizeBytes, uploadStatus: "PENDING", retentionUntil: new Date(Date.now() + retentionDays * 86_400_000) } } } });
    const response = { receiptId, objectKey };
    await tx.idempotencyKey.create({ data: { storeId: store.id, scope: "INIT_RECEIPT_UPLOAD", key: input.idempotencyKey, requestHash, status: "COMPLETED", response, expiresAt: new Date(Date.now() + 86_400_000) } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_UPLOAD_INITIALIZED", entityType: "Receipt", entityId: receiptId, correlationId, after: { mimeType: file.mimeType, sizeBytes: file.sizeBytes } } });
    return response;
  });
  const upload = await receiptStorage().prepareUpload(origin, prepared.objectKey, file.mimeType, file.sizeBytes);
  logger.info("receipt_upload_initialized", { storeId: store.id, receiptId: prepared.receiptId, correlationId });
  return { receiptId: prepared.receiptId, upload };
}

async function wakeReceiptWorker(jobId: string) {
  if (serverEnvironment.RECEIPT_JOB_PROVIDER !== "webhook") return;
  try {
    await fetch(serverEnvironment.RECEIPT_JOB_WAKE_URL!, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${serverEnvironment.RECEIPT_JOB_SECRET}` }, body: JSON.stringify({ jobId }), signal: AbortSignal.timeout(5000) });
  } catch (error) {
    logger.warn("receipt_job_wake_failed", { jobId, error: error instanceof Error ? error.name : "unknown" });
  }
}

export async function completeReceiptUpload(userId: string, receiptId: string) {
  const { store } = await contextFor(userId, true);
  const receipt = await database().receipt.findFirst({ where: { id: receiptId, storeId: store.id }, include: { file: true } });
  if (!receipt?.file) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
  if (["QUEUED", "PROCESSING", "REVIEW_READY", "CONFIRMED", "REVERSED", "REJECTED"].includes(receipt.status)) return { receiptId, status: receipt.status };
  if (!await receiptStorage().exists(receipt.file.objectKey)) throw new ReceiptError("UPLOAD_INCOMPLETE", "The photo did not finish uploading. Try the upload again.", 409);
  const stored = await receiptStorage().read(receipt.file.objectKey);
  if (stored.sizeBytes !== receipt.file.sizeBytes || stored.sizeBytes > receiptFilePolicy.maxBytes) throw new ReceiptError("UPLOAD_METADATA_MISMATCH", "The uploaded photo did not match the selected file. Choose it again.", 400);
  let image: { mimeType: string; width: number; height: number };
  try { image = inspectReceiptImage(stored.bytes); } catch { throw new ReceiptError("INVALID_IMAGE", "We couldn't open this image. Choose a JPEG, PNG, or WebP photo.", 400); }
  if (image.mimeType !== receipt.file.mimeType) throw new ReceiptError("FILE_TYPE_MISMATCH", "The image type does not match the selected file. Choose the photo again.", 400);
  if (image.width < receiptFilePolicy.minDimension || image.height < receiptFilePolicy.minDimension || image.width > receiptFilePolicy.maxDimension || image.height > receiptFilePolicy.maxDimension) throw new ReceiptError("IMAGE_DIMENSIONS", "Use a clearer photo between 320 and 12,000 pixels on each side.", 400);
  const duplicate = await database().receiptFile.findFirst({ where: { storeId: store.id, sha256: stored.sha256, receiptId: { not: receiptId }, receipt: { status: { notIn: ["REVERSED", "REJECTED"] } } }, orderBy: { createdAt: "desc" } });
  const jobId = randomUUID();
  await database().$transaction(async tx => {
    await tx.receiptFile.update({ where: { receiptId }, data: { sha256: stored.sha256, width: image.width, height: image.height, uploadStatus: "VALIDATED", uploadedAt: new Date(), validatedAt: new Date() } });
    await tx.receipt.update({ where: { id: receiptId }, data: { status: "QUEUED", duplicateWarning: Boolean(duplicate), duplicateOfId: duplicate?.receiptId ?? null, failedAt: null, lastErrorCode: null } });
    await tx.jobRun.upsert({ where: { storeId_externalId: { storeId: store.id, externalId: `receipt:${receiptId}:prepare:v1` } }, update: { status: "QUEUED", nextRetryAt: null, lastErrorCode: null, failureType: null, completedAt: null }, create: { id: jobId, storeId: store.id, receiptId, jobType: "PREPARE_RECEIPT", provider: serverEnvironment.RECEIPT_JOB_PROVIDER, externalId: `receipt:${receiptId}:prepare:v1`, status: "QUEUED", correlationId: receipt.correlationId, payloadHash: hash({ receiptId, sha256: stored.sha256 }) } });
    if (duplicate) await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_DUPLICATE_WARNING", entityType: "Receipt", entityId: receiptId, correlationId: receipt.correlationId, after: { possibleDuplicateId: duplicate.receiptId } } });
  });
  const job = await database().jobRun.findUnique({ where: { storeId_externalId: { storeId: store.id, externalId: `receipt:${receiptId}:prepare:v1` } } });
  if (job) {
    await wakeReceiptWorker(job.id);
    if (serverEnvironment.NODE_ENV === "development" && serverEnvironment.RECEIPT_JOB_PROVIDER === "database") setTimeout(() => { void processReceiptJob(job.id); }, 0);
  }
  logger.info("receipt_upload_completed", { storeId: store.id, receiptId, correlationId: receipt.correlationId, duplicateWarning: Boolean(duplicate) });
  logger.info("receipt_job_queued", { storeId: store.id, receiptId, correlationId: receipt.correlationId, jobType: "PREPARE_RECEIPT" });
  return { receiptId, status: "QUEUED" as const, duplicateWarning: Boolean(duplicate) };
}

type Candidate = { productId: string; source: string; score: number; rank: number };

export async function processReceiptJob(jobId: string) {
  const db = database();
  const job = await db.jobRun.findUnique({ where: { id: jobId }, include: { receipt: { include: { file: true } } } });
  if (!job?.receipt || job.jobType !== "PREPARE_RECEIPT") return { skipped: true };
  const receipt = job.receipt;
  const receiptFile = receipt.file;
  if (!receiptFile) return { skipped: true };
  const staleLeaseCutoff = new Date(Date.now() - 5 * 60_000);
  const claimed = await db.jobRun.updateMany({ where: { id: job.id, attempts: { lt: job.maxAttempts }, OR: [{ status: "QUEUED", OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] }, { status: "RUNNING", startedAt: { lte: staleLeaseCutoff } }] }, data: { status: "RUNNING", attempts: { increment: 1 }, startedAt: new Date(), nextRetryAt: null, lastErrorCode: null, failureType: null } });
  if (claimed.count !== 1) return { skipped: true };
  const provider = receiptExtractionProvider();
  try {
    await db.receipt.update({ where: { id: receipt.id }, data: { status: "PROCESSING", processingStartedAt: new Date(), failedAt: null, lastErrorCode: null } });
    logger.info("receipt_processing_started", { storeId: receipt.storeId, receiptId: receipt.id, correlationId: receipt.correlationId, attempt: job.attempts + 1 });
    await db.receiptExtraction.upsert({ where: { receiptId: receipt.id }, update: { provider: provider.id, providerVersion: provider.version, status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 }, failureCategory: null }, create: { storeId: receipt.storeId, receiptId: receipt.id, provider: provider.id, providerVersion: provider.version, status: "RUNNING", startedAt: new Date(), attempts: 1 } });
    const stored = await receiptStorage().read(receiptFile.objectKey);
    const result = await provider.extract({ receiptId: receipt.id, objectKey: receiptFile.objectKey, originalFilename: receiptFile.originalFilename, mimeType: receiptFile.mimeType, bytes: stored.bytes });
    logger.info("receipt_provider_completed", { storeId: receipt.storeId, receiptId: receipt.id, correlationId: receipt.correlationId, provider: provider.id });
    const normalizedLines = result.lines.map((line, index) => ({
      sourceOrder: index + 1,
      rawText: line.rawText,
      rawName: line.name?.trim() || line.rawText.trim() || `Line ${index + 1}`,
      normalizedName: normalizeReceiptText(line.name ?? line.rawText),
      barcode: normalizeBarcode(line.barcode),
      packagingText: line.packagingText?.trim() || null,
      quantity: parseReceiptQuantity(line.quantity),
      unitPrice: parsePeso(line.unitPrice),
      lineTotal: parsePeso(line.lineTotal),
      nonStock: isNonStockReceiptLine(line.name ?? line.rawText),
      confidence: line.internalConfidence ?? null,
    }));
    const normalizedNames = [...new Set(normalizedLines.map(line => line.normalizedName).filter(Boolean))];
    logger.info("receipt_normalization_completed", { storeId: receipt.storeId, receiptId: receipt.id, correlationId: receipt.correlationId, lineCount: normalizedLines.length });
    const barcodes = [...new Set(normalizedLines.map(line => line.barcode).filter((value): value is string => Boolean(value)))];
    const [aliases, barcodeRows, products] = await Promise.all([
      db.receiptAlias.findMany({ where: { storeId: receipt.storeId, active: true, normalizedText: { in: normalizedNames } }, select: { normalizedText: true, productId: true } }),
      barcodes.length ? db.productBarcode.findMany({ where: { storeId: receipt.storeId, status: "ACTIVE", normalizedValue: { in: barcodes }, product: { status: "ACTIVE" } }, select: { normalizedValue: true, productId: true } }) : Promise.resolve([]),
      db.product.findMany({ where: { storeId: receipt.storeId, status: "ACTIVE" }, select: { id: true, name: true, normalizedName: true }, orderBy: { normalizedName: "asc" }, take: 2000 }),
    ]);
    const aliasMap = new Map(aliases.map(alias => [alias.normalizedText, alias.productId]));
    const barcodeMap = new Map(barcodeRows.map(barcode => [barcode.normalizedValue, barcode.productId]));
    logger.info("receipt_matching_completed", { storeId: receipt.storeId, receiptId: receipt.id, correlationId: receipt.correlationId, candidateProductCount: products.length });
    await db.$transaction(async tx => {
      await tx.receiptLineMatch.deleteMany({ where: { storeId: receipt.storeId, receiptLine: { receiptId: receipt.id } } });
      await tx.receiptLine.deleteMany({ where: { storeId: receipt.storeId, receiptId: receipt.id } });
      for (const line of normalizedLines) {
        const candidates: Candidate[] = [];
        const aliasProduct = aliasMap.get(line.normalizedName);
        const barcodeProduct = line.barcode ? barcodeMap.get(line.barcode) : undefined;
        const exact = products.find(product => product.normalizedName === line.normalizedName);
        if (aliasProduct) candidates.push({ productId: aliasProduct, source: "ALIAS", score: 1, rank: 1 });
        else if (barcodeProduct) candidates.push({ productId: barcodeProduct, source: "BARCODE", score: 1, rank: 1 });
        else if (exact) candidates.push({ productId: exact.id, source: "EXACT_NAME", score: 1, rank: 1 });
        else rankProductCandidates(line.normalizedName, products).forEach((product, index) => candidates.push({ productId: product.id, source: "FUZZY_NAME", score: product.score, rank: index + 1 }));
        const state = line.nonStock ? "EXCLUDED" : line.quantity && candidateReviewState(candidates) === "CONFIRMED" ? "CONFIRMED" : candidates.length ? "NEEDS_REVIEW" : "UNMATCHED";
        const selected = state === "CONFIRMED" ? candidates[0] : undefined;
        await tx.receiptLine.create({ data: { storeId: receipt.storeId, receiptId: receipt.id, sourceOrder: line.sourceOrder, rawText: line.rawText, rawName: line.rawName, normalizedName: line.normalizedName, barcode: line.barcode, packagingText: line.packagingText, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal, internalConfidence: line.confidence, excluded: line.nonStock, reviewState: state, finalProductId: selected?.productId ?? null, finalQuantity: state === "CONFIRMED" ? line.quantity : null, matches: candidates.length ? { create: candidates.map(candidate => ({ storeId: receipt.storeId, productId: candidate.productId, status: state, source: candidate.source, rank: candidate.rank, internalScore: candidate.score, selected: candidate.productId === selected?.productId, userConfirmed: false })) } : undefined } });
      }
      const parsedDate = result.receiptDate ? new Date(`${result.receiptDate}T12:00:00.000Z`) : null;
      const safeDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
      const grandTotal = parsePeso(result.grandTotal);
      await tx.receiptExtraction.update({ where: { receiptId: receipt.id }, data: { status: "SUCCEEDED", providerOperationId: result.operationId, rawText: result.rawText, normalizedData: json({ supplier: result.supplier, receiptDate: result.receiptDate, subtotal: result.subtotal ?? null, tax: result.tax ?? null, grandTotal, warnings: result.warnings ?? [] }), internalConfidence: result.internalConfidence ? json(result.internalConfidence) : undefined, supplierName: result.supplier, receiptDate: safeDate, grandTotal, completedAt: new Date(), failureCategory: null } });
      await tx.receipt.update({ where: { id: receipt.id }, data: { status: "REVIEW_READY", supplierText: result.supplier, receiptDate: safeDate, grandTotal, processedAt: new Date(), failedAt: null, lastErrorCode: null } });
      await tx.jobRun.update({ where: { id: job.id }, data: { status: "SUCCEEDED", completedAt: new Date(), nextRetryAt: null } });
      await tx.auditEvent.create({ data: { storeId: receipt.storeId, action: "RECEIPT_REVIEW_READY", entityType: "Receipt", entityId: receipt.id, correlationId: receipt.correlationId, after: { lineCount: normalizedLines.length } } });
    });
    logger.info("receipt_review_ready", { storeId: receipt.storeId, receiptId: receipt.id, correlationId: receipt.correlationId, lineCount: normalizedLines.length });
    return { skipped: false, status: "REVIEW_READY" as const };
  } catch (error) {
    const code = (error as { code?: string }).code ?? "PROCESSING_FAILED";
    const retryDelay = receiptRetryDelayMs(code, job.attempts + 1, job.maxAttempts);
    const retryable = retryDelay !== null;
    const nextRetryAt = retryDelay === null ? null : new Date(Date.now() + retryDelay);
    await db.$transaction([db.receipt.update({ where: { id: receipt.id }, data: { status: retryable ? "QUEUED" : "FAILED", failedAt: retryable ? null : new Date(), lastErrorCode: code } }), db.receiptExtraction.upsert({ where: { receiptId: receipt.id }, update: { status: retryable ? "PENDING" : "FAILED", failureCategory: code }, create: { storeId: receipt.storeId, receiptId: receipt.id, provider: provider.id, providerVersion: provider.version, status: retryable ? "PENDING" : "FAILED", attempts: 1, failureCategory: code } }), db.jobRun.update({ where: { id: job.id }, data: { status: retryable ? "QUEUED" : "FAILED", completedAt: retryable ? null : new Date(), nextRetryAt, lastErrorCode: code, failureType: code } })]);
    logger.error("receipt_processing_failed", { storeId: receipt.storeId, receiptId: receipt.id, correlationId: receipt.correlationId, failureType: code });
    return { skipped: false, status: retryable ? "QUEUED" as const : "FAILED" as const };
  }
}

export async function runQueuedReceiptJobs(limit = 5) {
  const jobs = await database().jobRun.findMany({ where: { jobType: "PREPARE_RECEIPT", status: "QUEUED", OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }] }, orderBy: { createdAt: "asc" }, take: limit, select: { id: true } });
  const results = [];
  for (const job of jobs) results.push(await processReceiptJob(job.id));
  return results;
}

export async function retryReceipt(userId: string, receiptId: string) {
  const { store } = await contextFor(userId, true);
  const receipt = await database().receipt.findFirst({ where: { id: receiptId, storeId: store.id }, include: { jobRuns: { where: { jobType: "PREPARE_RECEIPT" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!receipt) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
  if (receipt.status !== "FAILED" && receipt.status !== "REVIEW_READY") throw new ReceiptError("INVALID_STATE", "This receipt cannot be prepared again.", 409);
  const job = receipt.jobRuns[0];
  if (!job || (receipt.status === "FAILED" && job.attempts >= job.maxAttempts)) throw new ReceiptError("RETRY_LIMIT", "This receipt needs a clearer photo. Upload it again to continue.", 409);
  await database().$transaction(async tx => {
    await tx.receipt.update({ where: { id: receipt.id }, data: { status: "QUEUED", failedAt: null, lastErrorCode: null } });
    await tx.jobRun.update({ where: { id: job.id }, data: { status: "QUEUED", attempts: receipt.status === "REVIEW_READY" ? 0 : job.attempts, nextRetryAt: null, completedAt: null, lastErrorCode: null, failureType: null } });
    await tx.receiptExtraction.updateMany({ where: { receiptId: receipt.id }, data: { status: "PENDING", failureCategory: null } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_REPROCESS_REQUESTED", entityType: "Receipt", entityId: receipt.id, correlationId: receipt.correlationId, before: { status: receipt.status }, after: { status: "QUEUED" } } });
  });
  logger.info("receipt_retry_queued", { storeId: store.id, receiptId, correlationId: receipt.correlationId, attempt: job.attempts + 1 });
  await wakeReceiptWorker(job.id);
  if (serverEnvironment.NODE_ENV === "development" && serverEnvironment.RECEIPT_JOB_PROVIDER === "database") setTimeout(() => { void processReceiptJob(job.id); }, 0);
  logger.info("receipt_retry_attempted", { storeId: store.id, receiptId, correlationId: receipt.correlationId, attempt: job.attempts + 1 });
  return { receiptId, status: "QUEUED" as const };
}

export async function discardReceiptUpload(userId: string, receiptId: string) {
  const { store, role } = await contextFor(userId);
  const receipt = await database().receipt.findFirst({ where: { id: receiptId, storeId: store.id }, include: { file: true } });
  if (!receipt) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
  if (role !== "OWNER" && receipt.createdById !== userId) throw new ReceiptError("FORBIDDEN", "You can only remove a receipt photo you uploaded.", 403);
  if (receipt.status !== "UPLOADED" && receipt.status !== "FAILED") throw new ReceiptError("INVALID_STATE", "This receipt is part of your store history and cannot be removed.", 409);

  if (receipt.file) {
    try {
      await receiptStorage().deleteObject(receipt.file.objectKey);
    } catch (error) {
      logger.error("receipt_discard_storage_failed", { storeId: store.id, receiptId, correlationId: receipt.correlationId, error: error instanceof Error ? error.name : "unknown" });
      throw new ReceiptError("STORAGE_DELETE_FAILED", "We couldn't remove the receipt photo. Check your connection and try again.", 503);
    }
  }

  await database().$transaction(async tx => {
    const current = await tx.receipt.findFirst({ where: { id: receiptId, storeId: store.id }, select: { status: true } });
    if (!current) return;
    if (current.status !== "UPLOADED" && current.status !== "FAILED") throw new ReceiptError("INVALID_STATE", "This receipt is part of your store history and cannot be removed.", 409);
    await tx.receiptLineMatch.deleteMany({ where: { storeId: store.id, receiptLine: { receiptId } } });
    await tx.receiptLine.deleteMany({ where: { storeId: store.id, receiptId } });
    await tx.receiptExtraction.deleteMany({ where: { storeId: store.id, receiptId } });
    await tx.jobRun.deleteMany({ where: { storeId: store.id, receiptId } });
    await tx.receiptFile.deleteMany({ where: { storeId: store.id, receiptId } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_UPLOAD_DISCARDED", entityType: "Receipt", entityId: receiptId, correlationId: receipt.correlationId, before: { status: current.status }, after: { removed: true } } });
    await tx.receipt.delete({ where: { id: receiptId } });
  });
  logger.info("receipt_upload_discarded", { storeId: store.id, receiptId, correlationId: receipt.correlationId });
  return { receiptId, removed: true as const };
}

export async function listReceipts(userId: string, raw: unknown = {}) {
  const { store } = await contextFor(userId);
  const input = historyInput.parse(raw);
  const statuses = input.status === "attention" ? ["QUEUED", "PROCESSING", "REVIEW_READY", "FAILED"] as const : input.status === "confirmed" ? ["CONFIRMED", "REVERSED"] as const : undefined;
  const records = await database().receipt.findMany({ where: { storeId: store.id, ...(statuses ? { status: { in: [...statuses] } } : {}) }, take: input.limit + 1, ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}), orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: { createdBy: { select: { name: true, email: true } }, confirmation: { include: { confirmedBy: { select: { name: true, email: true } } } }, lines: { select: { id: true, excluded: true, reviewState: true, finalQuantity: true } }, reversal: true, rejection: true } });
  const counts = await database().receipt.groupBy({ by: ["status"], where: { storeId: store.id }, _count: { id: true } });
  const byStatus = new Map(counts.map(count => [count.status, count._count.id]));
  return { items: records.slice(0, input.limit).map(receipt => ({ id: receipt.id, status: receipt.status, supplier: receipt.supplierText, receiptDate: receipt.receiptDate?.toISOString() ?? null, createdAt: receipt.createdAt.toISOString(), confirmedAt: receipt.confirmedAt?.toISOString() ?? null, grandTotal: receipt.grandTotal?.toString() ?? null, duplicateWarning: receipt.duplicateWarning && !receipt.duplicateAcknowledgedAt, lineCount: receipt.lines.length, attentionCount: receipt.lines.filter(line => !line.excluded && line.reviewState !== "CONFIRMED").length, totalQuantity: receipt.confirmation?.totalQuantity ?? 0, actor: receipt.confirmation?.confirmedBy.name ?? receipt.confirmation?.confirmedBy.email ?? null, reversed: Boolean(receipt.reversal), rejected: Boolean(receipt.rejection) })), nextCursor: records.length > input.limit ? records[input.limit - 1]?.id ?? null : null, counts: { all: [...byStatus.values()].reduce((sum, count) => sum + count, 0), attention: ["QUEUED", "PROCESSING", "REVIEW_READY", "FAILED"].reduce((sum, status) => sum + (byStatus.get(status as never) ?? 0), 0), confirmed: (byStatus.get("CONFIRMED") ?? 0) + (byStatus.get("REVERSED") ?? 0) } };
}

export async function receiptDashboardIndicators(userId: string) {
  const { store } = await contextFor(userId);
  const [counts, reviewReceipts] = await Promise.all([
    database().receipt.groupBy({ by: ["status"], where: { storeId: store.id }, _count: { id: true } }),
    database().receipt.findMany({ where: { storeId: store.id, status: "REVIEW_READY" }, orderBy: { createdAt: "asc" }, select: { id: true, supplierText: true, lines: { select: { excluded: true, reviewState: true } } } }),
  ]);
  const byStatus = new Map(counts.map(item => [item.status, item._count.id]));
  const needsMapping = reviewReceipts.filter(receipt => receipt.lines.some(line => !line.excluded && line.reviewState !== "CONFIRMED"));
  const awaitingApproval = reviewReceipts.filter(receipt => receipt.lines.some(line => !line.excluded) && receipt.lines.every(line => line.excluded || line.reviewState === "CONFIRMED"));
  const first = (items: typeof reviewReceipts) => items[0] ? { id: items[0].id, supplier: items[0].supplierText } : null;
  return {
    processing: { count: (byStatus.get("UPLOADED") ?? 0) + (byStatus.get("QUEUED") ?? 0) + (byStatus.get("PROCESSING") ?? 0) },
    needsMapping: { count: needsMapping.length, first: first(needsMapping) },
    awaitingApproval: { count: awaitingApproval.length, first: first(awaitingApproval) },
    failed: { count: byStatus.get("FAILED") ?? 0 },
  };
}

export async function receiptStatus(userId: string, receiptId: string) {
  const { store } = await contextFor(userId);
  const receipt = await database().receipt.findFirst({ where: { id: receiptId, storeId: store.id }, select: { id: true, status: true, duplicateWarning: true, duplicateAcknowledgedAt: true, lastErrorCode: true, lines: { select: { reviewState: true, excluded: true } } } });
  if (!receipt) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
  return { ...receipt, duplicateWarning: receipt.duplicateWarning && !receipt.duplicateAcknowledgedAt, message: receipt.status === "FAILED" ? publicFailure(receipt.lastErrorCode ?? undefined) : null, attentionCount: receipt.lines.filter(line => !line.excluded && line.reviewState !== "CONFIRMED").length };
}

export async function readReceipt(userId: string, receiptId: string, origin: string) {
  const { store, role } = await contextFor(userId);
  const receipt = await database().receipt.findFirst({
    where: { id: receiptId, storeId: store.id },
    include: {
      file: true,
      extraction: true,
      createdBy: { select: { name: true, email: true } },
      confirmation: {
        include: {
          confirmedBy: { select: { name: true, email: true } },
          movements: {
            orderBy: { createdAt: "asc" },
            include: {
              product: { select: { name: true, sellingUnit: true, otherUnitRaw: true } },
              receiptLine: { select: { id: true, sourceOrder: true } },
            },
          },
        },
      },
      reversal: { include: { reversedBy: { select: { name: true, email: true } } } },
      rejection: { include: { rejectedBy: { select: { name: true, email: true } } } },
      duplicateOf: { select: { id: true, supplierText: true, createdAt: true } },
      lines: {
        orderBy: { sourceOrder: "asc" },
        include: {
          finalProduct: { select: { id: true, name: true, sellingUnit: true, otherUnitRaw: true, status: true, balance: { select: { quantity: true } } } },
          matches: {
            orderBy: { rank: "asc" },
            include: { product: { select: { id: true, name: true, sellingUnit: true, otherUnitRaw: true, status: true, balance: { select: { quantity: true } } } } },
          },
        },
      },
    },
  });
  if (!receipt) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
  const imageExpired = Boolean(receipt.file?.purgedAt);
  const imageAvailable = receipt.file?.uploadStatus === "VALIDATED" && !imageExpired;
  return { id: receipt.id, status: receipt.status, supplier: receipt.supplierText, receiptDate: receipt.receiptDate?.toISOString() ?? null, grandTotal: receipt.grandTotal?.toString() ?? null, createdAt: receipt.createdAt.toISOString(), uploadedBy: receipt.createdBy.name ?? receipt.createdBy.email, confirmedAt: receipt.confirmedAt?.toISOString() ?? null, processedAt: receipt.processedAt?.toISOString() ?? null, duplicateWarning: receipt.duplicateWarning && !receipt.duplicateAcknowledgedAt, duplicateOf: receipt.duplicateOf ? { ...receipt.duplicateOf, createdAt: receipt.duplicateOf.createdAt.toISOString() } : null, errorMessage: receipt.status === "FAILED" ? publicFailure(receipt.lastErrorCode ?? undefined) : null, imageUrl: imageAvailable ? await receiptStorage().signedReadUrl(origin, receipt.file!.objectKey) : null, downloadUrl: imageAvailable ? await receiptStorage().signedReadUrl(origin, receipt.file!.objectKey, receipt.file!.originalFilename) : null, imageName: receipt.file?.originalFilename ?? null, imageExpired, rawText: receipt.extraction?.rawText ?? null, lines: receipt.lines.map(line => ({ id: line.id, sourceOrder: line.sourceOrder, rawText: line.rawText, rawName: line.rawName, normalizedName: line.normalizedName, packagingText: line.packagingText, quantity: line.quantity?.toString() ?? null, unitPrice: (line.confirmedUnitPrice ?? line.unitPrice)?.toString() ?? null, lineTotal: line.lineTotal?.toString() ?? null, excluded: line.excluded, reviewState: line.reviewState, finalQuantity: line.finalQuantity, finalProduct: line.finalProduct, matches: line.matches.map(match => ({ id: match.id, source: match.source, selected: match.selected, userConfirmed: match.userConfirmed, product: match.product })) })), confirmation: receipt.confirmation ? { id: receipt.confirmation.id, includedLineCount: receipt.confirmation.includedLineCount, excludedLineCount: receipt.confirmation.excludedLineCount, totalQuantity: receipt.confirmation.totalQuantity, confirmedAt: receipt.confirmation.confirmedAt.toISOString(), actor: receipt.confirmation.confirmedBy.name ?? receipt.confirmation.confirmedBy.email, movements: receipt.confirmation.movements.map(movement => ({ id: movement.id, productName: movement.product.name, sellingUnit: movement.product.sellingUnit, otherUnitRaw: movement.product.otherUnitRaw, quantityDelta: movement.quantityDelta, previousQuantity: movement.previousQuantity, resultingQuantity: movement.resultingQuantity, createdAt: movement.createdAt.toISOString(), receiptLineId: movement.receiptLine?.id ?? null })) } : null, reversal: receipt.reversal ? { reason: receipt.reversal.reason, createdAt: receipt.reversal.createdAt.toISOString(), actor: receipt.reversal.reversedBy.name ?? receipt.reversal.reversedBy.email } : null, rejection: receipt.rejection ? { reason: receipt.rejection.reason, createdAt: receipt.rejection.createdAt.toISOString(), actor: receipt.rejection.rejectedBy.name ?? receipt.rejection.rejectedBy.email } : null, canReverse: role === "OWNER" && receipt.status === "CONFIRMED", canReject: receipt.status === "REVIEW_READY", canDiscard: (receipt.status === "UPLOADED" || receipt.status === "FAILED") && (role === "OWNER" || receipt.createdById === userId) };
}

export async function saveReceiptLineReview(userId: string, receiptId: string, lineId: string, raw: unknown) {
  const { store } = await contextFor(userId, true);
  const input = reviewChangeInput.parse(raw);
  const line = await database().receiptLine.findFirst({ where: { id: lineId, receiptId, storeId: store.id }, include: { receipt: { select: { status: true, correlationId: true } } } });
  if (!line) throw new ReceiptError("NOT_FOUND", "Receipt item not found.", 404);
  if (line.receipt.status !== "REVIEW_READY") throw new ReceiptError("INVALID_STATE", "This receipt is not ready for changes.", 409);
  let productId = input.productId === undefined ? line.finalProductId : input.productId;
  let quantity = input.quantity === undefined ? line.finalQuantity ?? parseReceiptQuantity(line.quantity?.toString()) : input.quantity;
  const excluded = input.excluded ?? line.excluded;
  if (excluded) { productId = null; quantity = null; }
  if (productId) {
    const product = await database().product.findFirst({ where: { id: productId, storeId: store.id, status: "ACTIVE" }, select: { id: true } });
    if (!product) throw new ReceiptError("PRODUCT_UNAVAILABLE", "That product is no longer available. Choose another product.", 409);
  }
  const reviewState = excluded ? "EXCLUDED" : productId && quantity ? "CONFIRMED" : productId ? "NEEDS_REVIEW" : "UNMATCHED";
  await database().$transaction(async tx => {
    await tx.receiptLine.update({ where: { id: line.id }, data: { excluded, finalProductId: productId, correctedQuantity: input.quantity === undefined ? line.correctedQuantity : input.quantity, finalQuantity: quantity, confirmedUnitPrice: input.unitPrice === undefined ? line.confirmedUnitPrice : input.unitPrice, reviewState, correctedById: userId, correctedAt: new Date() } });
    if (productId) {
      await tx.receiptLineMatch.updateMany({ where: { receiptLineId: line.id }, data: { selected: false, userConfirmed: false } });
      await tx.receiptLineMatch.upsert({ where: { id: (await tx.receiptLineMatch.findFirst({ where: { receiptLineId: line.id, productId }, select: { id: true } }))?.id ?? `new-${randomUUID()}` }, update: { selected: true, userConfirmed: true, status: "CONFIRMED" }, create: { storeId: store.id, receiptLineId: line.id, productId, status: "CONFIRMED", source: "USER_SELECTED", rank: 1, selected: true, userConfirmed: true } });
    }
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_LINE_REVIEWED", entityType: "ReceiptLine", entityId: line.id, correlationId: line.receipt.correlationId, before: { productId: line.finalProductId, quantity: line.finalQuantity, unitPrice: line.confirmedUnitPrice?.toString() ?? line.unitPrice?.toString() ?? null, excluded: line.excluded }, after: { productId, quantity, unitPrice: input.unitPrice === undefined ? line.confirmedUnitPrice?.toString() ?? line.unitPrice?.toString() ?? null : input.unitPrice, excluded, reviewState } } });
  });
  return { lineId, reviewState, excluded, productId, quantity };
}

export async function createProductFromReceiptLine(userId: string, receiptId: string, lineId: string, raw: unknown) {
  const { store, role } = await contextFor(userId, true); requireReceiptOwner(role);
  const line = await database().receiptLine.findFirst({ where: { id: lineId, receiptId, storeId: store.id }, include: { receipt: { select: { status: true, supplierText: true } } } });
  if (!line || line.receipt.status !== "REVIEW_READY") throw new ReceiptError("NOT_FOUND", "Receipt item not found or no longer editable.", 404);
  const input = createFromLineInput.parse(raw);
  const barcodeChoice = input.manufacturerBarcode ? "MANUFACTURER" : "NONE";
  const created = await createProduct(userId, { name: input.name, category: input.category, supplier: line.receipt.supplierText, sellingUnit: input.sellingUnit, otherUnitRaw: input.otherUnitRaw, sellingPrice: input.sellingPrice, latestPurchaseCost: line.unitPrice ? Number(line.unitPrice) : null, lowStockThreshold: input.lowStockThreshold, startingQuantity: 0, barcodeChoice, manufacturerBarcode: input.manufacturerBarcode, idempotencyKey: input.idempotencyKey });
  await saveReceiptLineReview(userId, receiptId, lineId, { productId: created.id, quantity: line.finalQuantity ?? parseReceiptQuantity(line.quantity?.toString()) });
  return created;
}

export async function confirmReceipt(userId: string, receiptId: string, raw: unknown) {
  const { store } = await contextFor(userId, true); const input = confirmationInput.parse(raw);
  for (let attempt = 0; attempt < 5; attempt++) try {
    return await database().$transaction(async tx => {
      const receipt = await tx.receipt.findFirst({ where: { id: receiptId, storeId: store.id }, include: { confirmation: true, lines: { orderBy: { sourceOrder: "asc" }, include: { finalProduct: { include: { balance: true } } } } } });
      if (!receipt) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
      const payload = { receiptId, acknowledgeDuplicate: input.acknowledgeDuplicate, lines: receipt.lines.map(line => ({ id: line.id, excluded: line.excluded, productId: line.finalProductId, quantity: line.finalQuantity })) };
      const requestHash = hash(payload);
      const prior = await tx.idempotencyKey.findUnique({ where: { storeId_scope_key: { storeId: store.id, scope: "CONFIRM_RECEIPT", key: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new ReceiptError("IDEMPOTENCY_CONFLICT", "This confirmation key was already used for different receipt changes.", 409); logger.info("receipt_confirmation_idempotent_replay", { storeId: store.id, receiptId }); return prior.response; }
      if (receipt.confirmation || receipt.status === "CONFIRMED" || receipt.status === "REVERSED") throw new ReceiptError("ALREADY_CONFIRMED", "This receipt has already updated inventory.", 409);
      if (receipt.status !== "REVIEW_READY") throw new ReceiptError("INVALID_STATE", "Finish preparing this receipt before confirming it.", 409);
      if (receipt.duplicateWarning && !receipt.duplicateAcknowledgedAt && !input.acknowledgeDuplicate) throw new ReceiptError("POSSIBLE_DUPLICATE", "This may be a receipt you already uploaded. Review the warning before confirming.", 409);
      const unresolved = unresolvedReceiptLines(receipt.lines);
      if (unresolved.length) throw new ReceiptError("UNRESOLVED_LINES", "Check every included item before confirming.", 409, unresolved.map(line => line.id));
      const included = receipt.lines.filter(line => !line.excluded);
      if (!included.length) throw new ReceiptError("NO_STOCK_LINES", "Keep at least one product item before confirming this receipt.", 409);
      for (const line of included) if (!line.finalProduct || line.finalProduct.status !== "ACTIVE" || !line.finalProduct.balance) throw new ReceiptError("PRODUCT_UNAVAILABLE", "One or more selected products are no longer available. Choose another product.", 409, [line.id]);
      const correlationId = randomUUID();
      const confirmation = await tx.receiptConfirmation.create({ data: { storeId: store.id, receiptId, confirmedById: userId, idempotencyKey: input.idempotencyKey, payloadHash: requestHash, correlationId, includedLineCount: included.length, excludedLineCount: receipt.lines.length - included.length, totalQuantity: included.reduce((sum, line) => sum + line.finalQuantity!, 0) } });
      const balances = new Map(included.map(line => [line.finalProductId!, { quantity: line.finalProduct!.balance!.quantity, version: line.finalProduct!.balance!.version }]));
      for (const line of included) {
        const current = balances.get(line.finalProductId!)!;
        const quantity = line.finalQuantity!;
        const update = await tx.inventoryBalance.updateMany({ where: { storeId: store.id, productId: line.finalProductId!, version: current.version }, data: { quantity: { increment: quantity }, version: { increment: 1 } } });
        if (update.count !== 1) throw new ReceiptError("STOCK_CHANGED", `Stock changed for ${line.finalProduct!.name}. Try confirming again.`, 409, [line.id]);
        const resulting = current.quantity + quantity;
        balances.set(line.finalProductId!, { quantity: resulting, version: current.version + 1 });
        await tx.inventoryMovement.create({ data: { storeId: store.id, productId: line.finalProductId!, actorId: userId, type: "RECEIPT", quantityDelta: quantity, previousQuantity: current.quantity, resultingQuantity: resulting, sourceType: "RECEIPT", sourceId: receipt.id, receiptLineId: line.id, receiptConfirmationId: confirmation.id, correlationId } });
        const purchaseCost = line.confirmedUnitPrice ?? line.unitPrice;
        await tx.receiptLine.update({ where: { id: line.id }, data: { confirmedUnitPrice: purchaseCost, confirmedLineTotal: purchaseCost ? Number(purchaseCost) * quantity : line.lineTotal, reviewState: "CONFIRMED" } });
        if (purchaseCost) await tx.product.update({ where: { id: line.finalProductId! }, data: { latestPurchaseCost: purchaseCost, version: { increment: 1 } } });
        await tx.receiptAlias.upsert({ where: { storeId_normalizedText: { storeId: store.id, normalizedText: line.normalizedName } }, update: { productId: line.finalProductId!, sourceReceiptId: receipt.id, active: true }, create: { storeId: store.id, normalizedText: line.normalizedName, productId: line.finalProductId!, sourceReceiptId: receipt.id } });
      }
      await tx.receipt.update({ where: { id: receipt.id }, data: { status: "CONFIRMED", confirmedAt: new Date(), duplicateAcknowledgedAt: input.acknowledgeDuplicate ? new Date() : receipt.duplicateAcknowledgedAt } });
      const response = { receiptId: receipt.id, confirmationId: confirmation.id, totalQuantity: confirmation.totalQuantity, confirmedAt: confirmation.confirmedAt.toISOString() };
      await tx.idempotencyKey.create({ data: { storeId: store.id, scope: "CONFIRM_RECEIPT", key: input.idempotencyKey, requestHash, status: "COMPLETED", response, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
      await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_CONFIRMED", entityType: "Receipt", entityId: receipt.id, correlationId, before: { status: "REVIEW_READY" }, after: { status: "CONFIRMED", totalQuantity: confirmation.totalQuantity, lineCount: included.length } } });
      logger.info("receipt_confirmed", { storeId: store.id, receiptId, correlationId, totalQuantity: confirmation.totalQuantity });
      return response;
    }, receiptAtomicTransactionOptions);
  } catch (error) { if (isTransactionConflict(error) && attempt < 4) { await retryPause(attempt); continue; } throw error; }
  throw new ReceiptError("STOCK_CHANGED", "Stock changed while confirming. Review the receipt and try again.", 409);
}

export async function rejectReceipt(userId: string, receiptId: string, raw: unknown) {
  const { store } = await contextFor(userId, true);
  const input = rejectionInput.parse(raw);
  const requestHash = hash({ receiptId, reason: input.reason });
  return database().$transaction(async tx => {
    const prior = await tx.idempotencyKey.findUnique({ where: { storeId_scope_key: { storeId: store.id, scope: "REJECT_RECEIPT", key: input.idempotencyKey } } });
    if (prior) {
      if (prior.requestHash !== requestHash) throw new ReceiptError("IDEMPOTENCY_CONFLICT", "This rejection request was already used for another reason.", 409);
      return prior.response;
    }
    const receipt = await tx.receipt.findFirst({ where: { id: receiptId, storeId: store.id }, include: { confirmation: true, rejection: true } });
    if (!receipt) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
    if (receipt.rejection || receipt.status === "REJECTED") throw new ReceiptError("ALREADY_REJECTED", "This receipt has already been rejected.", 409);
    if (receipt.confirmation || receipt.status !== "REVIEW_READY") throw new ReceiptError("INVALID_STATE", "Only a receipt awaiting review can be rejected.", 409);
    const correlationId = randomUUID();
    const rejection = await tx.receiptRejection.create({ data: { storeId: store.id, receiptId, rejectedById: userId, idempotencyKey: input.idempotencyKey, reason: input.reason, correlationId } });
    await tx.receipt.update({ where: { id: receiptId }, data: { status: "REJECTED" } });
    const response = { receiptId, rejectionId: rejection.id, rejectedAt: rejection.createdAt.toISOString() };
    await tx.idempotencyKey.create({ data: { storeId: store.id, scope: "REJECT_RECEIPT", key: input.idempotencyKey, requestHash, status: "COMPLETED", response, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_REJECTED", entityType: "Receipt", entityId: receiptId, correlationId, before: { status: "REVIEW_READY" }, after: { status: "REJECTED", reason: input.reason } } });
    logger.info("receipt_rejected", { storeId: store.id, receiptId, correlationId });
    return response;
  }, receiptAtomicTransactionOptions);
}

export async function reverseReceipt(userId: string, receiptId: string, raw: unknown) {
  const { store, role } = await contextFor(userId, true); requireReceiptOwner(role); const input = reversalInput.parse(raw); const requestHash = hash({ receiptId, reason: input.reason });
  for (let attempt = 0; attempt < 5; attempt++) try {
    return await database().$transaction(async tx => {
      const prior = await tx.idempotencyKey.findUnique({ where: { storeId_scope_key: { storeId: store.id, scope: "REVERSE_RECEIPT", key: input.idempotencyKey } } });
      if (prior) { if (prior.requestHash !== requestHash) throw new ReceiptError("IDEMPOTENCY_CONFLICT", "This reversal request was already used for another reason.", 409); return prior.response; }
      const receipt = await tx.receipt.findFirst({ where: { id: receiptId, storeId: store.id }, include: { reversal: true, confirmation: { include: { movements: { where: { type: "RECEIPT" }, include: { product: { include: { balance: true } } }, orderBy: { createdAt: "asc" } } } } } });
      if (!receipt) throw new ReceiptError("NOT_FOUND", "Receipt not found.", 404);
      if (receipt.reversal || receipt.status === "REVERSED") throw new ReceiptError("ALREADY_REVERSED", "This receipt has already been reversed.", 409);
      if (receipt.status !== "CONFIRMED" || !receipt.confirmation) throw new ReceiptError("INVALID_STATE", "Only a confirmed receipt can be reversed.", 409);
      const requiredByProduct = new Map<string, { name: string; required: number; available: number; version: number }>();
      for (const movement of receipt.confirmation.movements) {
        const priorRequired = requiredByProduct.get(movement.productId);
        requiredByProduct.set(movement.productId, { name: movement.product.name, required: (priorRequired?.required ?? 0) + movement.quantityDelta, available: movement.product.balance?.quantity ?? 0, version: movement.product.balance?.version ?? -1 });
      }
      const conflicts = [...requiredByProduct].filter(([, item]) => item.available < item.required).map(([productId, item]) => ({ productId, name: item.name, required: item.required, available: item.available }));
      if (conflicts.length) throw new ReceiptError("REVERSAL_STOCK_CONFLICT", `Some stock from this receipt has already been sold or adjusted. Correct ${conflicts.map(item => item.name).join(", ")} before reversing.`, 409, conflicts);
      const correlationId = randomUUID();
      const balances = new Map([...requiredByProduct].map(([productId, item]) => [productId, { quantity: item.available, version: item.version }]));
      for (const movement of receipt.confirmation.movements) {
        const balance = balances.get(movement.productId)!;
        const updated = await tx.inventoryBalance.updateMany({ where: { storeId: store.id, productId: movement.productId, version: balance.version, quantity: { gte: movement.quantityDelta } }, data: { quantity: { decrement: movement.quantityDelta }, version: { increment: 1 } } });
        if (updated.count !== 1) throw new ReceiptError("STOCK_CHANGED", `Stock changed for ${movement.product.name}. Try again.`, 409);
        await tx.inventoryMovement.create({ data: { storeId: store.id, productId: movement.productId, actorId: userId, type: "REVERSAL", quantityDelta: -movement.quantityDelta, previousQuantity: balance.quantity, resultingQuantity: balance.quantity - movement.quantityDelta, sourceType: "RECEIPT_REVERSAL", sourceId: receipt.id, receiptLineId: movement.receiptLineId, receiptConfirmationId: receipt.confirmation.id, correlationId } });
        balances.set(movement.productId, { quantity: balance.quantity - movement.quantityDelta, version: balance.version + 1 });
      }
      const reversal = await tx.receiptReversal.create({ data: { storeId: store.id, receiptId: receipt.id, confirmationId: receipt.confirmation.id, reversedById: userId, reason: input.reason, correlationId } });
      await tx.receipt.update({ where: { id: receipt.id }, data: { status: "REVERSED", reversedAt: reversal.createdAt } });
      const response = { receiptId: receipt.id, reversalId: reversal.id, reversedAt: reversal.createdAt.toISOString() };
      await tx.idempotencyKey.create({ data: { storeId: store.id, scope: "REVERSE_RECEIPT", key: input.idempotencyKey, requestHash, status: "COMPLETED", response, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
      await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "RECEIPT_REVERSED", entityType: "Receipt", entityId: receipt.id, correlationId, before: { status: "CONFIRMED" }, after: { status: "REVERSED", reason: input.reason } } });
      logger.info("receipt_reversed", { storeId: store.id, receiptId, correlationId });
      return response;
    }, receiptAtomicTransactionOptions);
  } catch (error) { if (isTransactionConflict(error) && attempt < 4) { await retryPause(attempt); continue; } throw error; }
  throw new ReceiptError("STOCK_CHANGED", "Stock changed while reversing. Try again.", 409);
}

export async function receiptAttentionCount(userId: string) {
  const { store } = await contextFor(userId);
  return database().receipt.count({ where: { storeId: store.id, status: { in: ["REVIEW_READY", "FAILED"] } } });
}
