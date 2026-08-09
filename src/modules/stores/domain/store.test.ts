import { describe, expect, it } from "vitest";
import { storeInput } from "./store";

describe("store onboarding validation", () => {
  it("preserves every visible onboarding preference", () => {
    expect(storeInput.parse({
      name: "  Rosa's Store  ",
      storeType: "Mini-mart",
      language: "FIL",
      lowStockEnabled: false,
      dailySummaryEnabled: false,
    })).toMatchObject({
      name: "Rosa's Store",
      storeType: "Mini-mart",
      language: "FIL",
      lowStockEnabled: false,
      dailySummaryEnabled: false,
    });
  });

  it("rejects blank store names and unknown store types", () => {
    expect(storeInput.safeParse({ name: " ", storeType: "Warehouse" }).success).toBe(false);
  });
});

