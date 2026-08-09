import { describe, expect, it } from "vitest";
import { operatingViewInternals } from "./operating-view-service";

describe("operating view periods", () => {
  it("starts a Manila week on Monday without using the server timezone", () => {
    const period = operatingViewInternals.manilaPeriod("week", new Date("2026-08-09T04:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-08-02T16:00:00.000Z");
  });

  it("starts a Manila month at local midnight", () => {
    const period = operatingViewInternals.manilaPeriod("month", new Date("2026-08-30T20:00:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-07-31T16:00:00.000Z");
  });
});
