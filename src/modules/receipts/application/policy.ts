import { ReceiptError } from "./errors";

export function mayWorkWithReceipts(role: string) {
  return role === "OWNER" || role === "STAFF";
}

export function requireReceiptAccess(role: string) {
  if (!mayWorkWithReceipts(role)) throw new ReceiptError("FORBIDDEN", "You do not have permission to work with receipts.", 403);
}

export function requireReceiptOwner(role: string) {
  if (role !== "OWNER") throw new ReceiptError("OWNER_REQUIRED", "Only the store owner can reverse a confirmed receipt or create a product here.", 403);
}

