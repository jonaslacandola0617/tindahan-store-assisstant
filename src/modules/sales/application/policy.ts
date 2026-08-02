import { SalesError } from "./errors";

export function mayRecordSale(role: "OWNER" | "STAFF") {
  if (role !== "OWNER" && role !== "STAFF") throw new SalesError("FORBIDDEN", "You cannot record sales for this store.", 403);
}

export function requireSaleOwner(role: "OWNER" | "STAFF") {
  if (role !== "OWNER") throw new SalesError("FORBIDDEN", "Only the store owner can correct a recorded sale.", 403);
}
