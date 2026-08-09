import { describe, expect, it } from "vitest";
import { candidateReviewState, rankProductCandidates, receiptNameSimilarity } from "./matching";

describe("receipt product matching", () => {
  const products = [
    { id: "milk", name: "Bear Brand 33g", normalizedName: "bear brand 33g" },
    { id: "tuna", name: "Tuna", normalizedName: "tuna" },
    { id: "soap", name: "Laundry Soap", normalizedName: "laundry soap" },
  ];

  it("ranks deterministic near matches without leaking unrelated products", () => {
    const ranked = rankProductCandidates("Bear Brnd 33g", products);
    expect(ranked[0]?.id).toBe("milk");
    expect(ranked.some(candidate => candidate.id === "tuna")).toBe(false);
    expect(rankProductCandidates("Bear Brnd 33g", products)).toEqual(ranked);
  });

  it("auto-confirms exact or unambiguous high matches and leaves uncertain ones for review", () => {
    expect(receiptNameSimilarity("TUNA", "tuna")).toBe(1);
    expect(candidateReviewState([{ score: 1 }])).toBe("CONFIRMED");
    expect(candidateReviewState([{ score: 0.82 }, { score: 0.8 }])).toBe("NEEDS_REVIEW");
    expect(candidateReviewState([])).toBe("UNMATCHED");
  });
});
