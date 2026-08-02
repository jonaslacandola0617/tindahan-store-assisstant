import { describe, expect, it } from "vitest";
import { calculateStockChange, stockStatus } from "./inventory";

describe("inventory rules", () => {
  it("classifies current stock without relying on color", () => { expect(stockStatus(0, 5)).toBe("out_of_stock"); expect(stockStatus(5, 5)).toBe("low_stock"); expect(stockStatus(6, 5)).toBe("in_stock"); });
  it("returns the immutable movement quantities", () => { expect(calculateStockChange(8, -3)).toEqual({ previousQuantity: 8, quantityDelta: -3, resultingQuantity: 5 }); });
  it("rejects negative stock instead of clamping", () => { expect(() => calculateStockChange(2, -3)).toThrow("NEGATIVE_STOCK"); });
  it("rejects a zero or fractional movement", () => { expect(() => calculateStockChange(2, 0)).toThrow("INVALID_STOCK_CHANGE"); expect(() => calculateStockChange(2, 1.5)).toThrow("INVALID_STOCK_CHANGE"); });
});
