export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export function stockStatus(quantity: number, lowStockThreshold: number): StockStatus {
  if (quantity === 0) return "out_of_stock";
  return quantity <= lowStockThreshold ? "low_stock" : "in_stock";
}

export function calculateStockChange(current: number, delta: number) {
  if (!Number.isInteger(current) || current < 0 || !Number.isInteger(delta) || delta === 0) {
    throw new Error("INVALID_STOCK_CHANGE");
  }
  const resulting = current + delta;
  if (resulting < 0) throw new Error("NEGATIVE_STOCK");
  return { previousQuantity: current, quantityDelta: delta, resultingQuantity: resulting };
}
