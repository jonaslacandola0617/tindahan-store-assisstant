import { describe, expect, it } from "vitest";
import { activeMembershipForStore, canManageStore } from "./access";

describe("store access", () => {
  const memberships = [{ storeId: "store-a", role: "OWNER" as const, status: "ACTIVE" as const }];

  it("does not accept a store outside the user's memberships", () => {
    expect(activeMembershipForStore(memberships, "store-b")).toBeNull();
  });

  it("reserves store administration for owners", () => {
    expect(canManageStore("OWNER")).toBe(true);
    expect(canManageStore("STAFF")).toBe(false);
  });
});
