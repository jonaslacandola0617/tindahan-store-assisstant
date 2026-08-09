import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnvironment } from "@/platform/environment/server";
import { awsS3Client } from "./aws-s3-client";

export type UploadTarget = { method: "PUT"; url: string; headers: Record<string, string>; expiresAt: string };
export type StoredObject = { sizeBytes: number; sha256: string; bytes: Uint8Array };
export interface ReceiptStorageProvider {
  prepareUpload(origin: string, objectKey: string, mimeType: string, sizeBytes: number): Promise<UploadTarget>;
  read(objectKey: string): Promise<StoredObject>;
  exists(objectKey: string): Promise<boolean>;
  signedReadUrl(origin: string, objectKey: string, downloadName?: string): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}

type LocalToken = { action: "upload" | "read"; key: string; mimeType: string; sizeBytes: number; expiresAt: number; downloadName?: string };

function safeDownloadName(value: string) {
  return value.trim().replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "-").slice(0, 160) || "receipt-image";
}

function secret() {
  const value = serverEnvironment.NEXTAUTH_SECRET ?? (serverEnvironment.NODE_ENV !== "production" ? serverEnvironment.DEMO_PASSWORD.padEnd(32, "-") : undefined);
  if (!value) throw new Error("Receipt signing is not configured.");
  return value;
}

function signToken(payload: LocalToken) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyLocalReceiptToken(token: string, action: LocalToken["action"]) {
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) throw new Error("INVALID_UPLOAD_TOKEN");
  const expected = createHmac("sha256", secret()).update(encoded).digest();
  const actual = Buffer.from(supplied, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("INVALID_UPLOAD_TOKEN");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as LocalToken;
  if (payload.action !== action || payload.expiresAt < Date.now()) throw new Error("EXPIRED_UPLOAD_TOKEN");
  return payload;
}

function localRoot() {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".tindahan-private");
}

function localPath(objectKey: string) {
  assertReceiptObjectKey(objectKey);
  const target = path.join(/* turbopackIgnore: true */ localRoot(), ...objectKey.split("/"));
  if (!target.startsWith(`${localRoot()}${path.sep}`)) throw new Error("INVALID_OBJECT_KEY");
  return target;
}

export async function storeLocalReceiptUpload(token: string, bytes: Uint8Array, mimeType: string) {
  const payload = verifyLocalReceiptToken(token, "upload");
  if (payload.mimeType !== mimeType || payload.sizeBytes !== bytes.byteLength) throw new Error("UPLOAD_METADATA_MISMATCH");
  const target = localPath(payload.key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

export function receiptObjectPrefix() {
  const configured = serverEnvironment.RECEIPT_STORAGE_DIR.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!configured || configured.includes("..")) throw new Error("INVALID_RECEIPT_STORAGE_PREFIX");
  return configured.split("/").at(-1)!;
}

export function createReceiptObjectKey(input: { storeId: string; receiptId: string; fileId: string; mimeType: string; now?: Date }) {
  const now = input.now ?? new Date();
  const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : input.mimeType === "image/jpeg" ? "jpg" : null;
  if (!extension) throw new Error("UNSUPPORTED_RECEIPT_MIME_TYPE");
  const key = `${receiptObjectPrefix()}/${input.storeId}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${input.receiptId}/${input.fileId}.${extension}`;
  assertReceiptObjectKey(key, input.storeId);
  return key;
}

export function assertReceiptObjectKey(objectKey: string, expectedStoreId?: string) {
  if (!objectKey || objectKey.startsWith("/") || objectKey.includes("\\") || objectKey.split("/").some(part => !part || part === "." || part === ".." || !/^[a-zA-Z0-9._-]+$/.test(part))) throw new Error("INVALID_OBJECT_KEY");
  const parts = objectKey.split("/");
  const legacy = parts.length === 5 && parts[0] === "stores" && parts[2] === "receipts";
  const current = parts.length === 6 && parts[0] === receiptObjectPrefix() && /^\d{4}$/.test(parts[2]!) && /^(0[1-9]|1[0-2])$/.test(parts[3]!);
  if (!legacy && !current) throw new Error("INVALID_OBJECT_KEY");
  if (expectedStoreId && parts[1] !== expectedStoreId) throw new Error("INVALID_OBJECT_KEY");
}

function objectMissing(error: unknown) {
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return value.name === "NoSuchKey" || value.name === "NotFound" || value.$metadata?.httpStatusCode === 404;
}

export class LocalReceiptStorageProvider implements ReceiptStorageProvider {
  async prepareUpload(origin: string, objectKey: string, mimeType: string, sizeBytes: number): Promise<UploadTarget> {
    assertReceiptObjectKey(objectKey);
    const seconds = serverEnvironment.RECEIPT_UPLOAD_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + seconds * 1000);
    const token = signToken({ action: "upload", key: objectKey, mimeType, sizeBytes, expiresAt: expiresAt.getTime() });
    return { method: "PUT", url: `${origin}/api/receipts/files/local/${token}`, headers: { "content-type": mimeType }, expiresAt: expiresAt.toISOString() };
  }
  async read(objectKey: string): Promise<StoredObject> {
    const bytes = new Uint8Array(await readFile(localPath(objectKey)));
    return { bytes, sizeBytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
  }
  async exists(objectKey: string) {
    try { return (await stat(localPath(objectKey))).isFile(); } catch { return false; }
  }
  async signedReadUrl(origin: string, objectKey: string, downloadName?: string) {
    assertReceiptObjectKey(objectKey);
    const seconds = serverEnvironment.RECEIPT_READ_TTL_SECONDS;
    const mimeType = objectKey.endsWith(".png") ? "image/png" : objectKey.endsWith(".webp") ? "image/webp" : "image/jpeg";
    const token = signToken({ action: "read", key: objectKey, mimeType, sizeBytes: 0, expiresAt: Date.now() + seconds * 1000, downloadName: downloadName ? safeDownloadName(downloadName) : undefined });
    return `${origin}/api/receipts/files/local/${token}`;
  }
  async deleteObject(objectKey: string) {
    try { await unlink(localPath(objectKey)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
}

export class AwsS3ReceiptStorageProvider implements ReceiptStorageProvider {
  private readonly bucket = serverEnvironment.RECEIPT_S3_BUCKET!;
  private readonly client = awsS3Client();

  async prepareUpload(_origin: string, objectKey: string, mimeType: string, sizeBytes: number): Promise<UploadTarget> {
    assertReceiptObjectKey(objectKey);
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) throw new Error("INVALID_RECEIPT_FILE_SIZE");
    const seconds = serverEnvironment.RECEIPT_UPLOAD_TTL_SECONDS;
    const url = await getSignedUrl(this.client, new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, ContentType: mimeType }), { expiresIn: seconds, signableHeaders: new Set(["content-type"]) });
    return { method: "PUT", url, headers: { "content-type": mimeType }, expiresAt: new Date(Date.now() + seconds * 1000).toISOString() };
  }
  async read(objectKey: string): Promise<StoredObject> {
    assertReceiptObjectKey(objectKey);
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    if (!response.Body) throw new Error("RECEIPT_OBJECT_UNAVAILABLE");
    const bytes = await response.Body.transformToByteArray();
    return { bytes, sizeBytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
  }
  async exists(objectKey: string) {
    assertReceiptObjectKey(objectKey);
    try { await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey })); return true; }
    catch (error) { if (objectMissing(error)) return false; throw error; }
  }
  async signedReadUrl(_origin: string, objectKey: string, downloadName?: string) {
    assertReceiptObjectKey(objectKey);
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: objectKey, ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${safeDownloadName(downloadName)}"` } : {}) }), { expiresIn: serverEnvironment.RECEIPT_READ_TTL_SECONDS });
  }
  async deleteObject(objectKey: string) {
    assertReceiptObjectKey(objectKey);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }
}

let provider: ReceiptStorageProvider | undefined;
export function receiptStorage(): ReceiptStorageProvider {
  if (!provider) provider = serverEnvironment.RECEIPT_STORAGE_PROVIDER === "local" ? new LocalReceiptStorageProvider() : new AwsS3ReceiptStorageProvider();
  return provider;
}

export function resetReceiptStorageForTests() { provider = undefined; }

export function inspectReceiptImage(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength >= 33 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    let offset = 8, width = 0, height = 0, ended = false;
    while (offset + 12 <= bytes.byteLength) {
      const length = view.getUint32(offset); const end = offset + 12 + length;
      if (end > bytes.byteLength) throw new Error("INVALID_IMAGE");
      const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
      const expected = view.getUint32(offset + 8 + length);
      if (crc32(bytes.slice(offset + 4, offset + 8 + length)) !== expected) throw new Error("INVALID_IMAGE");
      if (type === "IHDR") { if (length !== 13 || offset !== 8) throw new Error("INVALID_IMAGE"); width = view.getUint32(offset + 8); height = view.getUint32(offset + 12); }
      if (type === "IEND") { ended = length === 0; break; }
      offset = end;
    }
    if (width > 0 && height > 0 && ended) return { mimeType: "image/png", width, height };
  }
  if (bytes.byteLength >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    if (view.getUint32(4, true) + 8 > bytes.byteLength) throw new Error("INVALID_IMAGE");
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    if (kind === "VP8X") return { mimeType: "image/webp", width: 1 + view.getUint8(24) + (view.getUint8(25) << 8) + (view.getUint8(26) << 16), height: 1 + view.getUint8(27) + (view.getUint8(28) << 8) + (view.getUint8(29) << 16) };
    if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { mimeType: "image/webp", width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (kind === "VP8L" && bytes[20] === 0x2f) { const bits = view.getUint32(21, true); return { mimeType: "image/webp", width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) }; }
  }
  if (bytes.byteLength >= 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < bytes.byteLength) {
      if (view.getUint8(offset) !== 0xff) { offset++; continue; }
      const marker = view.getUint8(offset + 1);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) return { mimeType: "image/jpeg", height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      const length = view.getUint16(offset + 2);
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  throw new Error("INVALID_IMAGE");
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
