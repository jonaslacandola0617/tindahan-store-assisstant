import { z } from "zod";

export const saleLineInput = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(2_000_000_000),
});

export const confirmSaleInput = z.object({
  lines: z.array(saleLineInput).min(1).max(200),
  idempotencyKey: z.string().min(8).max(120),
});

export function mergeSaleLines(lines: readonly { productId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const line of lines) merged.set(line.productId, (merged.get(line.productId) ?? 0) + line.quantity);
  return [...merged].map(([productId, quantity]) => ({ productId, quantity })).sort((a, b) => a.productId.localeCompare(b.productId));
}

export function shouldIgnoreRapidScan(previous: { code: string; at: number } | null, code: string, at: number, cooldownMs = 900) {
  return Boolean(previous && previous.code === code && at - previous.at >= 0 && at - previous.at < cooldownMs);
}

export function saleTotals(lines: readonly { quantity: number; unitPrice: number }[]) {
  return lines.reduce((total, line) => ({ quantity: total.quantity + line.quantity, amount: total.amount + line.quantity * line.unitPrice }), { quantity: 0, amount: 0 });
}
