import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { expect, it } from "vitest";

const cloudTest = process.env.RUN_RECEIPT_CLOUD_SMOKE === "true" ? it : it.skip;

cloudTest("verifies configured private S3 and Azure receipt processing", async () => {
  process.env.RECEIPT_STORAGE_PROVIDER = "aws";
  process.env.RECEIPT_OCR_PROVIDER = "azure";
  const [{ serverEnvironment }, { createReceiptObjectKey, inspectReceiptImage, receiptStorage }, { awsS3Client }, { AzureDocumentIntelligenceReceiptProvider }] = await Promise.all([
    import("@/platform/environment/server"),
    import("@/platform/storage/receipt-storage"),
    import("@/platform/storage/aws-s3-client"),
    import("@/modules/receipts/infrastructure/extraction-providers"),
  ]);
  expect(serverEnvironment.RECEIPT_STORAGE_PROVIDER).toBe("aws");
  expect(serverEnvironment.RECEIPT_OCR_PROVIDER).toBe("azure");
  const sourcePath = path.resolve(process.cwd(), process.env.RECEIPT_CLOUD_SMOKE_FILE || "docs/fixtures/receipts/receipt-normal.png");
  const extension = path.extname(sourcePath).toLowerCase();
  const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : extension === ".webp" ? "image/webp" : "image/png";
  const bytes = new Uint8Array(await readFile(sourcePath));
  expect(inspectReceiptImage(bytes).mimeType).toBe(mimeType);
  const objectKey = createReceiptObjectKey({ storeId: `smoke-${randomUUID()}`, receiptId: randomUUID(), fileId: randomUUID(), mimeType });
  const storage = receiptStorage();
  let uploaded = false;
  try {
    const corsOrigin = process.env.RECEIPT_CORS_ORIGIN?.trim();
    if (corsOrigin) {
      const corsProbeUrl = `https://${serverEnvironment.RECEIPT_S3_BUCKET}.s3.${serverEnvironment.RECEIPT_S3_REGION}.amazonaws.com/${objectKey}`;
      const preflight = await fetch(corsProbeUrl, { method: "OPTIONS", headers: { origin: corsOrigin, "access-control-request-method": "PUT", "access-control-request-headers": "content-type" } });
      expect(preflight.status).toBe(200);
      expect(preflight.headers.get("access-control-allow-origin")).toBe(corsOrigin);
      expect(preflight.headers.get("access-control-allow-methods")).toContain("PUT");
      expect(preflight.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("content-type");
    }
    const upload = await storage.prepareUpload("http://localhost", objectKey, mimeType, bytes.byteLength);
    const uploadResponse = await fetch(upload.url, { method: upload.method, headers: { ...upload.headers, ...(corsOrigin ? { origin: corsOrigin } : {}) }, body: Buffer.from(bytes) });
    expect(uploadResponse.ok).toBe(true);
    if (corsOrigin) expect(uploadResponse.headers.get("access-control-allow-origin")).toBe(corsOrigin);
    uploaded = true;
    const [exists, stored, readUrl] = await Promise.all([storage.exists(objectKey), storage.read(objectKey), storage.signedReadUrl("http://localhost", objectKey)]);
    expect(exists).toBe(true);
    expect(stored.sizeBytes).toBe(bytes.byteLength);
    expect((await fetch(readUrl)).ok).toBe(true);
    const expiringUrl = await getSignedUrl(awsS3Client(), new GetObjectCommand({ Bucket: serverEnvironment.RECEIPT_S3_BUCKET, Key: objectKey }), { expiresIn: 1 });
    await new Promise(resolve => setTimeout(resolve, 2_000));
    expect((await fetch(expiringUrl)).ok).toBe(false);
    const publicUrl = `https://${serverEnvironment.RECEIPT_S3_BUCKET}.s3.${serverEnvironment.RECEIPT_S3_REGION}.amazonaws.com/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
    expect((await fetch(publicUrl, { redirect: "manual" })).ok).toBe(false);
    const extraction = await new AzureDocumentIntelligenceReceiptProvider().extract({ receiptId: "smoke", objectKey, originalFilename: path.basename(sourcePath), mimeType, bytes: stored.bytes });
    expect(extraction.rawText).toEqual(expect.any(String));
  } finally {
    if (uploaded) {
      await storage.deleteObject(objectKey);
      expect(await storage.exists(objectKey)).toBe(false);
    }
  }
}, 120_000);
