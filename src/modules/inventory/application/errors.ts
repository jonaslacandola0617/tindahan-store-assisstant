export type InventoryErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "NEGATIVE_STOCK" | "DUPLICATE_BARCODE" | "ARCHIVED_PRODUCT";

export class InventoryError extends Error {
  constructor(public readonly code: InventoryErrorCode, message: string, public readonly status: number) { super(message); }
}
