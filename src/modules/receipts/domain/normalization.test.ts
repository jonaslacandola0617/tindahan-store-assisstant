import { describe, expect, it } from "vitest";
import { isNonStockReceiptLine, normalizeBarcode, normalizeReceiptText, parsePeso, parseReceiptQuantity } from "./normalization";

describe("receipt normalization", () => {
  it("normalizes OCR punctuation, casing, and spacing deterministically", () => {
    expect(normalizeReceiptText("  BEAR|BRAND — 33G  ")).toBe("bearibrand - 33g");
  });

  it("parses Philippine money without accepting malformed or negative values", () => {
    expect(parsePeso("₱1,240.50")).toBe(1240.5);
    expect(parsePeso("PHP 18.00")).toBe(18);
    expect(parsePeso("-10")).toBeNull();
    expect(parsePeso("18.999")).toBeNull();
  });

  it("parses only positive whole receipt quantities", () => {
    expect(parseReceiptQuantity("x 12 pcs")).toBe(12);
    expect(parseReceiptQuantity("2.5")).toBeNull();
    expect(parseReceiptQuantity(0)).toBeNull();
  });

  it("excludes totals and validates barcode shape", () => {
    expect(isNonStockReceiptLine("Grand total ₱120")).toBe(true);
    expect(isNonStockReceiptLine("Delivery fee 50.00")).toBe(true);
    expect(isNonStockReceiptLine("Powdered Milk 33g")).toBe(false);
    expect(normalizeBarcode("4800-0166-4001-7")).toBe("4800016640017");
    expect(normalizeBarcode("ABC123")).toBeNull();
  });
});
