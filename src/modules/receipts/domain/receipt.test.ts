import { describe, expect, it } from "vitest";
import { duplicateWarning, mayTransitionReceipt, unresolvedReceiptLines, validateReceiptFileMetadata } from "./receipt";

describe("receipt domain rules", () => {
  it("allows only the documented lifecycle transitions", () => {
    expect(mayTransitionReceipt("UPLOADED", "QUEUED")).toBe(true);
    expect(mayTransitionReceipt("FAILED", "QUEUED")).toBe(true);
    expect(mayTransitionReceipt("CONFIRMED", "REVERSED")).toBe(true);
    expect(mayTransitionReceipt("REVIEW_READY", "REJECTED")).toBe(true);
    expect(mayTransitionReceipt("REVERSED", "CONFIRMED")).toBe(false);
    expect(mayTransitionReceipt("REJECTED", "REVIEW_READY")).toBe(false);
    expect(mayTransitionReceipt("REVIEW_READY", "UPLOADED")).toBe(false);
  });

  it("finds included lines that still need a product or positive quantity", () => {
    const lines = [
      { id: "ready", excluded: false, finalProductId: "p1", finalQuantity: 2 },
      { id: "missing-product", excluded: false, finalProductId: null, finalQuantity: 1 },
      { id: "missing-quantity", excluded: false, finalProductId: "p2", finalQuantity: null },
      { id: "excluded", excluded: true, finalProductId: null, finalQuantity: null },
    ];
    expect(unresolvedReceiptLines(lines).map(line => line.id)).toEqual(["missing-product", "missing-quantity"]);
  });

  it("flags exact files or sufficiently strong contextual duplicate signals", () => {
    expect(duplicateWarning({ checksumMatch: true, supplierMatch: false, dateMatch: false, totalMatch: false, recentUpload: false })).toBe(true);
    expect(duplicateWarning({ checksumMatch: false, supplierMatch: true, dateMatch: true, totalMatch: true, recentUpload: false })).toBe(true);
    expect(duplicateWarning({ checksumMatch: false, supplierMatch: true, dateMatch: true, totalMatch: false, recentUpload: false })).toBe(false);
  });

  it("accepts safe image metadata and sanitizes the display filename", () => {
    expect(validateReceiptFileMetadata({ filename: "supplier/receipt.png", mimeType: "image/png", sizeBytes: 1024 })).toEqual({ filename: "supplier-receipt.png", mimeType: "image/png", sizeBytes: 1024 });
    expect(() => validateReceiptFileMetadata({ filename: "receipt.pdf", mimeType: "application/pdf", sizeBytes: 1024 })).toThrow("UNSUPPORTED_FILE_TYPE");
    expect(() => validateReceiptFileMetadata({ filename: "receipt.png", mimeType: "image/png", sizeBytes: 11 * 1024 * 1024 })).toThrow("INVALID_FILE_SIZE");
  });
});
