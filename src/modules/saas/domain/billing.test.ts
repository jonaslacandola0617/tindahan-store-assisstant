import { describe, expect, it } from "vitest";
import { calculateBillingAmounts, statementNumber } from "./billing";
describe("billing domain", () => {
  it("calculates configured tax using integer centavos", () => expect(calculateBillingAmounts(49_900, { enabled: true, rateBasisPoints: 1200, label: "Tax" })).toEqual({ subtotalCentavos: 49_900, taxCentavos: 5_988, totalCentavos: 55_888 }));
  it("keeps tax disabled without changing the configured price", () => expect(calculateBillingAmounts(49_900, { enabled: false, rateBasisPoints: 1200, label: "Tax" }).totalCentavos).toBe(49_900));
  it("creates stable statement identifiers without provider punctuation", () => expect(statementNumber("cycle_abc-123", new Date("2026-08-09T00:00:00Z"))).toBe("TIN-202608-CYCLEABC123"));
});
