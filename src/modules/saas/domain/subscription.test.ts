import { describe, expect, it } from "vitest";
import { effectivePlanState, mayWriteBusinessData } from "./subscription";

describe("subscription policy", () => {
  const now = new Date("2026-08-09T00:00:00Z");
  it("moves an ended trial through grace before restricting writes", () => {
    expect(effectivePlanState({ status: "TRIALING", trialEndsAt: new Date("2026-08-08T00:00:00Z") }, now, 7).status).toBe("GRACE");
    expect(effectivePlanState({ status: "TRIALING", trialEndsAt: new Date("2026-07-01T00:00:00Z") }, now, 7).status).toBe("RESTRICTED");
  });
  it("allows active and grace work but not restricted or canceled work", () => {
    expect(mayWriteBusinessData("ACTIVE")).toBe(true);
    expect(mayWriteBusinessData("GRACE")).toBe(true);
    expect(mayWriteBusinessData("RESTRICTED")).toBe(false);
    expect(mayWriteBusinessData("CANCELED")).toBe(false);
  });
});
