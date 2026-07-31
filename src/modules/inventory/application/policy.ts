import { InventoryError } from "./errors";

export function requireInventoryOwner(role: "OWNER" | "STAFF") {
  if (role !== "OWNER") throw new InventoryError("FORBIDDEN", "Only the store owner can make this change.", 403);
}
