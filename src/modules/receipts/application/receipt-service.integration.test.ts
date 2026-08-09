import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { database } from "@/platform/persistence/prisma";
import { completeReceiptUpload, confirmReceipt, discardReceiptUpload, initializeReceiptUpload, processReceiptJob, readReceipt, rejectReceipt, retryReceipt, reverseReceipt, saveReceiptLineReview } from "./receipt-service";
import { receiptStorage, storeLocalReceiptUpload } from "@/platform/storage/receipt-storage";

const databaseTests = process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE ? describe : describe.skip;

databaseTests("receipt PostgreSQL integration", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let ownerId = "", staffId = "", outsiderId = "", storeId = "", otherStoreId = "", productId = "", receiptId = "", lineId = "", uploadedObjectKey = "";

  beforeAll(async () => {
    const db = database();
    const [owner, staff, outsider] = await Promise.all([
      db.user.create({ data: { email: `phase4-owner-${suffix}@example.test` } }),
      db.user.create({ data: { email: `phase4-staff-${suffix}@example.test` } }),
      db.user.create({ data: { email: `phase4-other-${suffix}@example.test` } }),
    ]);
    ownerId = owner.id; staffId = staff.id; outsiderId = outsider.id;
    const store = await db.store.create({ data: { name: `Phase 4 ${suffix}`, preference: { create: {} }, memberships: { create: [{ userId: ownerId, role: "OWNER" }, { userId: staffId, role: "STAFF" }] } } });
    const other = await db.store.create({ data: { name: `Other Phase 4 ${suffix}`, preference: { create: {} }, memberships: { create: { userId: outsiderId, role: "OWNER" } } } });
    storeId = store.id; otherStoreId = other.id;
    const product = await db.product.create({ data: { storeId, name: "Bear Brand 33g", normalizedName: "bear brand 33g", sellingUnit: "PACK", sellingPrice: 18, lowStockThreshold: 2, balance: { create: { storeId, quantity: 4 } } } });
    productId = product.id;
    const receipt = await db.receipt.create({ data: { storeId, createdById: ownerId, status: "REVIEW_READY", idempotencyKey: `receipt-${suffix}`, correlationId: `correlation-${suffix}`, supplierText: "Home Table Foods", lines: { create: { storeId, sourceOrder: 1, rawText: "BEAR BRAND 33G 2 18.00", rawName: "BEAR BRAND 33G", normalizedName: "bear brand 33g", quantity: 2, unitPrice: 18, lineTotal: 36, excluded: false, reviewState: "CONFIRMED", finalProductId: productId, finalQuantity: 2 } } } });
    receiptId = receipt.id;
    lineId = (await db.receiptLine.findFirstOrThrow({ where: { receiptId } })).id;
  });

  afterAll(async () => {
    const db = database();
    for (const id of [storeId, otherStoreId]) {
      if (!id) continue;
      await db.auditEvent.deleteMany({ where: { storeId: id } });
      await db.idempotencyKey.deleteMany({ where: { storeId: id } });
      await db.receiptAlias.deleteMany({ where: { storeId: id } });
      await db.receiptRejection.deleteMany({ where: { storeId: id } });
      await db.receiptReversal.deleteMany({ where: { storeId: id } });
      await db.inventoryMovement.deleteMany({ where: { storeId: id } });
      await db.receiptConfirmation.deleteMany({ where: { storeId: id } });
      await db.receiptLineMatch.deleteMany({ where: { storeId: id } });
      await db.receiptLine.deleteMany({ where: { storeId: id } });
      await db.receiptExtraction.deleteMany({ where: { storeId: id } });
      await db.receiptFile.deleteMany({ where: { storeId: id } });
      await db.jobRun.deleteMany({ where: { storeId: id } });
      await db.receipt.deleteMany({ where: { storeId: id } });
      await db.inventoryBalance.deleteMany({ where: { storeId: id } });
      await db.product.deleteMany({ where: { storeId: id } });
      await db.storeMembership.deleteMany({ where: { storeId: id } });
      await db.storePreference.deleteMany({ where: { storeId: id } });
      await db.store.deleteMany({ where: { id } });
    }
    await db.user.deleteMany({ where: { id: { in: [ownerId, staffId, outsiderId] } } });
    if (uploadedObjectKey) await receiptStorage().deleteObject(uploadedObjectKey).catch(() => undefined);
  });

  it("keeps review access store-scoped", async () => {
    await expect(readReceipt(outsiderId, receiptId, "http://localhost:3000")).rejects.toThrow("Receipt not found");
    await expect(saveReceiptLineReview(outsiderId, receiptId, lineId, { quantity: 3 })).rejects.toThrow("Receipt item not found");
  });

  it("confirms atomically and applies an idempotent inventory movement", async () => {
    const input = { idempotencyKey: `confirm-${suffix}`, acknowledgeDuplicate: false };
    const first = await confirmReceipt(staffId, receiptId, input);
    const second = await confirmReceipt(staffId, receiptId, input);
    expect(second).toEqual(first);
    const balance = await database().inventoryBalance.findUniqueOrThrow({ where: { productId } });
    expect(balance.quantity).toBe(6);
    const confirmationId = (first as { confirmationId: string }).confirmationId;
    const movements = await database().inventoryMovement.findMany({ where: { storeId, receiptConfirmationId: confirmationId } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ type: "RECEIPT", quantityDelta: 2, previousQuantity: 4, resultingQuantity: 6, receiptLineId: lineId });
  });

  it("keeps reversal owner-only and records compensating history once", async () => {
    await expect(reverseReceipt(staffId, receiptId, { reason: "Duplicate receipt", idempotencyKey: `staff-reverse-${suffix}` })).rejects.toThrow("Only the store owner");
    const input = { reason: "Duplicate receipt", idempotencyKey: `reverse-${suffix}` };
    const first = await reverseReceipt(ownerId, receiptId, input);
    expect(await reverseReceipt(ownerId, receiptId, input)).toEqual(first);
    expect((await database().inventoryBalance.findUniqueOrThrow({ where: { productId } })).quantity).toBe(4);
    const movements = await database().inventoryMovement.findMany({ where: { storeId, productId }, orderBy: { createdAt: "asc" } });
    expect(movements.map(movement => movement.quantityDelta)).toEqual([2, -2]);
    expect((await database().receipt.findUniqueOrThrow({ where: { id: receiptId } })).status).toBe("REVERSED");
  });

  it("rejects a reviewed receipt idempotently without changing inventory", async () => {
    const db = database();
    const rejected = await db.receipt.create({ data: { storeId, createdById: staffId, status: "REVIEW_READY", idempotencyKey: `reject-target-${suffix}`, correlationId: `reject-correlation-${suffix}`, lines: { create: { storeId, sourceOrder: 1, rawText: "NOT A STOCK RECEIPT", rawName: "Unknown line", normalizedName: "unknown line", quantity: 1, excluded: false, reviewState: "UNMATCHED" } } } });
    const movementCount = await db.inventoryMovement.count({ where: { storeId } });
    const input = { reason: "Not a supplier receipt", idempotencyKey: `reject-${suffix}` };
    const first = await rejectReceipt(staffId, rejected.id, input);
    expect(await rejectReceipt(staffId, rejected.id, input)).toEqual(first);
    expect(await db.receipt.findUniqueOrThrow({ where: { id: rejected.id } })).toMatchObject({ status: "REJECTED" });
    expect(await db.inventoryMovement.count({ where: { storeId } })).toBe(movementCount);
    expect(await db.auditEvent.count({ where: { storeId, entityId: rejected.id, action: "RECEIPT_REJECTED" } })).toBe(1);
  });

  it("removes only an authorized unprocessed upload from storage and the receipt list", async () => {
    const db = database();
    const movementCount = await db.inventoryMovement.count({ where: { storeId } });
    const bytes = pngFixture(640, 960);
    const initialized = await initializeReceiptUpload(staffId, "http://localhost:3000", { filename: "not-a-receipt.png", mimeType: "image/png", sizeBytes: bytes.byteLength, idempotencyKey: `discard-${suffix}` });
    const token = new URL(initialized.upload.url).pathname.split("/").pop()!;
    const file = await db.receiptFile.findUniqueOrThrow({ where: { receiptId: initialized.receiptId } });
    await storeLocalReceiptUpload(token, bytes, "image/png");
    await db.receipt.update({ where: { id: initialized.receiptId }, data: { status: "FAILED", failedAt: new Date(), lastErrorCode: "UNREADABLE_RECEIPT" } });

    await expect(discardReceiptUpload(outsiderId, initialized.receiptId)).rejects.toThrow("Receipt not found");
    expect(await receiptStorage().exists(file.objectKey)).toBe(true);
    await expect(discardReceiptUpload(ownerId, receiptId)).rejects.toThrow("store history");

    await expect(discardReceiptUpload(staffId, initialized.receiptId)).resolves.toEqual({ receiptId: initialized.receiptId, removed: true });
    expect(await receiptStorage().exists(file.objectKey)).toBe(false);
    expect(await db.receipt.findUnique({ where: { id: initialized.receiptId } })).toBeNull();
    expect(await db.inventoryMovement.count({ where: { storeId } })).toBe(movementCount);
    expect(await db.auditEvent.count({ where: { storeId, entityId: initialized.receiptId, action: "RECEIPT_UPLOAD_DISCARDED" } })).toBe(1);
  });

  it("runs a private direct upload through the durable mock extraction job", async () => {
    const movementCountBefore = await database().inventoryMovement.count({ where: { storeId } });
    const bytes = pngFixture(640, 960);
    const initialized = await initializeReceiptUpload(ownerId, "http://localhost:3000", { filename: "phase4-receipt.png", mimeType: "image/png", sizeBytes: bytes.byteLength, idempotencyKey: `upload-${suffix}` });
    const token = new URL(initialized.upload.url).pathname.split("/").pop()!;
    uploadedObjectKey = (await database().receiptFile.findUniqueOrThrow({ where: { receiptId: initialized.receiptId } })).objectKey;
    await storeLocalReceiptUpload(token, bytes, "image/png");
    await completeReceiptUpload(ownerId, initialized.receiptId);
    const job = await database().jobRun.findFirstOrThrow({ where: { receiptId: initialized.receiptId, jobType: "PREPARE_RECEIPT" } });
    const attempts = await Promise.all([processReceiptJob(job.id), processReceiptJob(job.id)]);
    expect(attempts.filter(result => !result.skipped)).toHaveLength(1);
    expect(attempts.find(result => !result.skipped)).toMatchObject({ status: "REVIEW_READY" });
    const receipt = await readReceipt(ownerId, initialized.receiptId, "http://localhost:3000");
    expect(receipt.status).toBe("REVIEW_READY");
    expect(receipt.supplier).toBe("Home Table Foods");
    expect(receipt.lines).toHaveLength(5);
    expect(await database().receiptLine.count({ where: { receiptId: initialized.receiptId, internalConfidence: { not: null } } })).toBeGreaterThan(0);
    expect(receipt.lines.find(line => line.rawName === "Delivery fee")?.excluded).toBe(true);
    expect(await database().inventoryMovement.count({ where: { storeId } })).toBe(movementCountBefore);
    expect(await retryReceipt(ownerId, initialized.receiptId)).toMatchObject({ status: "QUEUED" });
    expect(await database().inventoryMovement.count({ where: { storeId } })).toBe(movementCountBefore);
    expect(await processReceiptJob(job.id)).toMatchObject({ skipped: false, status: "REVIEW_READY" });
    expect(await database().inventoryMovement.count({ where: { storeId } })).toBe(movementCountBefore);
    await database().$transaction([
      database().jobRun.update({ where: { id: job.id }, data: { status: "RUNNING", attempts: 1, startedAt: new Date(Date.now() - 6 * 60_000), completedAt: null } }),
      database().receipt.update({ where: { id: initialized.receiptId }, data: { status: "PROCESSING" } }),
    ]);
    expect(await processReceiptJob(job.id)).toMatchObject({ skipped: false, status: "REVIEW_READY" });
    expect(await database().inventoryMovement.count({ where: { storeId } })).toBe(movementCountBefore);
  }, 120_000);
});

function pngFixture(width: number, height: number) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.alloc((width * 3 + 1) * height, 255); for (let row = 0; row < height; row++) raw[row * (width * 3 + 1)] = 0;
  return new Uint8Array(Buffer.concat([signature, pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]));
}

function pngChunk(type: string, data: Buffer) {
  const name = Buffer.from(type); const output = Buffer.alloc(12 + data.length); output.writeUInt32BE(data.length, 0); name.copy(output, 4); data.copy(output, 8); output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length); return output;
}

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
