import { describe, expect, it } from "vitest";
import { requireInventoryOwner } from "./policy";

describe("inventory permissions", () => {
  it("allows owners and rejects staff mutations", () => { expect(()=>requireInventoryOwner("OWNER")).not.toThrow(); expect(()=>requireInventoryOwner("STAFF")).toThrow("Only the store owner"); });
});
