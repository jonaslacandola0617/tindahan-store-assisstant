const nonStockLabels = /^(subtotal|total|grand total|vat|tax|change|cash|discount|delivery fee|shipping fee|service fee|amount due|balance|invoice|receipt no|tin|thank you)\b/i;

export function normalizeReceiptText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[|]/g, "I")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-PH");
}

export function parsePeso(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
  const cleaned = value.replace(/[₱PHPphp\s,]/g, "").replace(/O(?=\d)/g, "0");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseReceiptQuantity(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? value : null;
  const match = value.trim().match(/^(?:x\s*)?(\d+)\s*(?:pcs?|pieces?|packs?|cans?|bottles?|sachets?|units?)?$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isNonStockReceiptLine(value: string) {
  return nonStockLabels.test(normalizeReceiptText(value));
}

export function normalizeBarcode(value: string | null | undefined) {
  const normalized = value?.replace(/[\s-]/g, "") ?? "";
  return /^\d{8,14}$/.test(normalized) ? normalized : null;
}
