export type TaxConfiguration = { enabled: boolean; rateBasisPoints: number; label: string };
export function calculateBillingAmounts(subtotalCentavos: number, tax: TaxConfiguration) {
  if (!Number.isInteger(subtotalCentavos) || subtotalCentavos < 0) throw new Error("Subtotal must be non-negative centavos.");
  const taxCentavos = tax.enabled ? Math.round(subtotalCentavos * tax.rateBasisPoints / 10_000) : 0;
  return { subtotalCentavos, taxCentavos, totalCentavos: subtotalCentavos + taxCentavos };
}
export function statementNumber(providerTransactionId: string, at: Date) {
  const safe = providerTransactionId.replace(/[^a-zA-Z0-9]/g, "").slice(-12).toUpperCase();
  return `TIN-${at.getUTCFullYear()}${String(at.getUTCMonth() + 1).padStart(2, "0")}-${safe || "PAYMENT"}`;
}
