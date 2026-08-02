import { describe, expect, it } from "vitest";
import { ean13CheckDigit, generateInternalBarcode, normalizeBarcode, validateBarcode } from "./barcode";

describe("barcode rules", () => {
  it("normalizes common scanner formatting", () => { expect(normalizeBarcode("4800 016-640017")).toBe("4800016640017"); });
  it("rejects nonnumeric and unreasonable barcode lengths", () => { expect(() => validateBarcode("abc")).toThrow("INVALID_BARCODE"); expect(() => validateBarcode("1234")).toThrow("INVALID_BARCODE"); });
  it("generates deterministic valid EAN-13 internal codes", () => { const code=generateInternalBarcode(()=>1); expect(code).toBe(`291111111111${ean13CheckDigit("291111111111")}`); expect(code).toHaveLength(13); });
});
