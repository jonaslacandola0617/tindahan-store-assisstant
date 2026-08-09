import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { assertReceiptObjectKey, createReceiptObjectKey, inspectReceiptImage, LocalReceiptStorageProvider, verifyLocalReceiptToken } from "./receipt-storage";

describe("private receipt storage", () => {
  it("issues short-lived store-scoped local upload targets", async () => {
    const key = "stores/store-1/receipts/receipt-1/file.png";
    const target = await new LocalReceiptStorageProvider().prepareUpload("http://localhost:3000", key, "image/png", 1200);
    expect(target.method).toBe("PUT");
    const token = new URL(target.url).pathname.split("/").pop()!;
    expect(verifyLocalReceiptToken(token, "upload")).toMatchObject({ key, mimeType: "image/png", sizeBytes: 1200 });
    expect(() => verifyLocalReceiptToken(`${token}x`, "upload")).toThrow();
  });

  it("issues a private read target with a safe download filename", async () => {
    const key = "receipts/store-1/2026/08/receipt-1/file-1.jpg";
    const target = await new LocalReceiptStorageProvider().signedReadUrl("http://localhost:3000", key, "Supplier:receipt/august.jpg");
    const token = new URL(target).pathname.split("/").pop()!;
    expect(verifyLocalReceiptToken(token, "read")).toMatchObject({ key, downloadName: "Supplier-receipt-august.jpg" });
  });

  it("validates a decodable PNG structure and rejects corrupted bytes", () => {
    const image = pngFixture(640, 960);
    expect(inspectReceiptImage(image)).toEqual({ mimeType: "image/png", width: 640, height: 960 });
    image[40] = image[40]! ^ 0xff;
    expect(() => inspectReceiptImage(image)).toThrow("INVALID_IMAGE");
  });

  it("generates private store-scoped keys without using filenames", () => {
    const key = createReceiptObjectKey({ storeId: "store-1", receiptId: "receipt-1", fileId: "file-1", mimeType: "image/jpeg", now: new Date("2026-08-02T00:00:00Z") });
    expect(key).toBe("receipts/store-1/2026/08/receipt-1/file-1.jpg");
    expect(() => assertReceiptObjectKey(key, "another-store")).toThrow("INVALID_OBJECT_KEY");
  });

  it("rejects traversal, leading slashes, and unsupported key shapes", () => {
    for (const key of ["/receipts/store/2026/08/r/f.jpg", "receipts/store/../08/r/f.jpg", "receipts/store/2026/08/r/customer name.jpg", "unrelated/file.jpg"]) {
      expect(() => assertReceiptObjectKey(key)).toThrow("INVALID_OBJECT_KEY");
    }
  });
});

function pngFixture(width: number, height: number) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.alloc((width * 3 + 1) * height, 255); for (let row = 0; row < height; row++) raw[row * (width * 3 + 1)] = 0;
  return new Uint8Array(Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
function chunk(type: string, data: Buffer) { const name = Buffer.from(type); const output = Buffer.alloc(12 + data.length); output.writeUInt32BE(data.length, 0); name.copy(output, 4); data.copy(output, 8); output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length); return output; }
function crc32(bytes: Buffer) { let crc = 0xffffffff; for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
