import { describe, expect, it } from "vitest";
import { canUseOperationalProduct, normalizeName, unitDetails } from "./product";

describe("product rules", () => {
  it("normalizes only a search companion while preserving entered names", () => { expect(normalizeName("  Fresh   Eggs ")).toBe("fresh eggs"); });
  it("stages Other units for later canonicalization", () => { expect(unitDetails("OTHER", "  tali ")).toEqual({ otherUnitRaw: "tali", needsUnitCanonicalization: true }); expect(() => unitDetails("OTHER", " ")).toThrow("OTHER_UNIT_REQUIRED"); });
  it("keeps normalized units clean", () => { expect(unitDetails("PIECE", "ignored")).toEqual({ otherUnitRaw: null, needsUnitCanonicalization: false }); });
  it("excludes archived products from operational selection", () => { expect(canUseOperationalProduct("ACTIVE")).toBe(true); expect(canUseOperationalProduct("ARCHIVED")).toBe(false); });
});
