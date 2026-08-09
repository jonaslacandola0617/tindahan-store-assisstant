import { describe, expect, it } from "vitest";
import { mayWorkWithReceipts, requireReceiptAccess, requireReceiptOwner } from "./policy";

describe("receipt permissions", () => {
  it("lets owners and staff process receipts", () => {
    expect(mayWorkWithReceipts("OWNER")).toBe(true);
    expect(mayWorkWithReceipts("STAFF")).toBe(true);
    expect(() => requireReceiptAccess("STAFF")).not.toThrow();
  });

  it("keeps product creation and reversal owner-only", () => {
    expect(() => requireReceiptOwner("OWNER")).not.toThrow();
    expect(() => requireReceiptOwner("STAFF")).toThrow("Only the store owner");
  });
});
