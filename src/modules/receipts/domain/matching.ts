import { normalizeReceiptText } from "./normalization";

export type MatchCandidate = { id: string; name: string; normalizedName: string };

function editDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row++) {
    let diagonal = previous[0]!;
    previous[0] = row;
    for (let column = 1; column <= b.length; column++) {
      const above = previous[column]!;
      previous[column] = Math.min(previous[column]! + 1, previous[column - 1]! + 1, diagonal + (a[row - 1] === b[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length]!;
}

export function receiptNameSimilarity(left: string, right: string) {
  const a = normalizeReceiptText(left);
  const b = normalizeReceiptText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  return Math.max(0, 1 - editDistance(a, b) / Math.max(a.length, b.length));
}

export function rankProductCandidates(rawName: string, products: readonly MatchCandidate[]) {
  return products
    .map(product => ({ ...product, score: receiptNameSimilarity(rawName, product.normalizedName) }))
    .filter(product => product.score >= 0.56)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 5);
}

export function candidateReviewState(candidates: readonly { score: number }[]) {
  if (!candidates.length) return "UNMATCHED" as const;
  if (candidates[0]!.score === 1 || (candidates[0]!.score >= 0.9 && (candidates[1]?.score ?? 0) < 0.8)) return "CONFIRMED" as const;
  return "NEEDS_REVIEW" as const;
}
