import { z } from "zod";

export const receiptStatuses = ["UPLOADED", "QUEUED", "PROCESSING", "REVIEW_READY", "CONFIRMED", "FAILED", "REVERSED", "REJECTED"] as const;
export type ReceiptState = (typeof receiptStatuses)[number];

const transitions: Record<ReceiptState, readonly ReceiptState[]> = {
  UPLOADED: ["QUEUED", "FAILED"],
  QUEUED: ["PROCESSING", "FAILED"],
  PROCESSING: ["REVIEW_READY", "FAILED"],
  REVIEW_READY: ["CONFIRMED", "FAILED", "REJECTED"],
  CONFIRMED: ["REVERSED"],
  FAILED: ["QUEUED"],
  REVERSED: [],
  REJECTED: [],
};

export function mayTransitionReceipt(from: ReceiptState, to: ReceiptState) {
  return transitions[from].includes(to);
}

export function requireReceiptTransition(from: ReceiptState, to: ReceiptState) {
  if (!mayTransitionReceipt(from, to)) throw new Error(`INVALID_RECEIPT_TRANSITION:${from}:${to}`);
}

export const reviewChangeInput = z.object({
  productId: z.string().min(1).nullable().optional(),
  quantity: z.coerce.number().int().positive().max(2_000_000_000).nullable().optional(),
  unitPrice: z.coerce.number().finite().min(0).max(99_999_999.99).nullable().optional(),
  excluded: z.boolean().optional(),
});

export const confirmationInput = z.object({
  idempotencyKey: z.string().min(8).max(120),
  acknowledgeDuplicate: z.boolean().default(false),
});

export const reversalInput = z.object({
  reason: z.string().trim().min(3).max(240),
  idempotencyKey: z.string().min(8).max(120),
});

export const rejectionInput = z.object({
  reason: z.string().trim().min(3).max(240),
  idempotencyKey: z.string().min(8).max(120),
});

export type ReviewableLine = {
  id: string;
  excluded: boolean;
  finalProductId: string | null;
  finalQuantity: number | null;
};

export function unresolvedReceiptLines(lines: readonly ReviewableLine[]) {
  return lines.filter(line => !line.excluded && (!line.finalProductId || !line.finalQuantity || line.finalQuantity <= 0));
}

export function duplicateWarning(input: {
  checksumMatch: boolean;
  supplierMatch: boolean;
  dateMatch: boolean;
  totalMatch: boolean;
  recentUpload: boolean;
}) {
  if (input.checksumMatch) return true;
  const contextualSignals = [input.supplierMatch, input.dateMatch, input.totalMatch, input.recentUpload].filter(Boolean).length;
  return contextualSignals >= 3;
}

export const receiptFilePolicy = {
  maxBytes: 10 * 1024 * 1024,
  minDimension: 320,
  maxDimension: 12_000,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
};

export function validateReceiptFileMetadata(input: { filename: string; mimeType: string; sizeBytes: number }) {
  const filename = input.filename.trim().replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").slice(0, 160);
  if (!filename) throw new Error("INVALID_FILENAME");
  if (!receiptFilePolicy.mimeTypes.includes(input.mimeType as (typeof receiptFilePolicy.mimeTypes)[number])) throw new Error("UNSUPPORTED_FILE_TYPE");
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > receiptFilePolicy.maxBytes) throw new Error("INVALID_FILE_SIZE");
  return { filename, mimeType: input.mimeType as (typeof receiptFilePolicy.mimeTypes)[number], sizeBytes: input.sizeBytes };
}
