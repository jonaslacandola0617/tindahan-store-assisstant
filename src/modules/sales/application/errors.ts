export type StockConflict = { productId: string; name: string; requested: number; available: number };

export class SalesError extends Error {
  constructor(public code: string, message: string, public status = 400, public conflicts?: StockConflict[]) {
    super(message);
    this.name = "SalesError";
  }
}
