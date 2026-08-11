import { describe, expect, it } from "vitest";
import { classifyStockTransition, operationalEmailInternals } from "./operational-email";

describe("operational email stock transitions", () => {
  it("alerts once when stock first crosses into the low-stock range", () => {
    expect(classifyStockTransition(10, 5, 5)).toBe("LOW");
    expect(classifyStockTransition(5, 4, 5)).toBeNull();
    expect(classifyStockTransition(4, 1, 5)).toBeNull();
  });

  it("escalates to out of stock only when positive stock reaches zero", () => {
    expect(classifyStockTransition(1, 0, 5)).toBe("OUT");
    expect(classifyStockTransition(10, 0, 5)).toBe("OUT");
    expect(classifyStockTransition(0, 0, 5)).toBeNull();
  });

  it("allows a future low-stock alert after a real restock", () => {
    expect(classifyStockTransition(0, 10, 5)).toBeNull();
    expect(classifyStockTransition(10, 5, 5)).toBe("LOW");
  });
});

describe("daily summary Manila day", () => {
  it("uses Asia/Manila midnight as the reporting boundary", () => {
    const lateEvening = operationalEmailInternals.manilaDay(new Date("2026-08-10T15:30:00.000Z"));
    expect(lateEvening.key).toBe("2026-08-10");
    expect(lateEvening.start.toISOString()).toBe("2026-08-09T16:00:00.000Z");

    const afterMidnight = operationalEmailInternals.manilaDay(new Date("2026-08-10T16:30:00.000Z"));
    expect(afterMidnight.key).toBe("2026-08-11");
    expect(afterMidnight.start.toISOString()).toBe("2026-08-10T16:00:00.000Z");
  });
});
