import { randomInt } from "node:crypto";

export function normalizeBarcode(value: string) {
  return value.replace(/[\s-]/g, "");
}

export function validateBarcode(value: string) {
  const normalized = normalizeBarcode(value);
  if (!/^\d{8,14}$/.test(normalized)) throw new Error("INVALID_BARCODE");
  return normalized;
}

export function ean13CheckDigit(firstTwelve: string) {
  if (!/^\d{12}$/.test(firstTwelve)) throw new Error("INVALID_BARCODE_SEED");
  const sum = [...firstTwelve].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function generateInternalBarcode(random = () => randomInt(0, 10)) {
  let firstTwelve = "29";
  while (firstTwelve.length < 12) firstTwelve += String(random());
  return firstTwelve + ean13CheckDigit(firstTwelve);
}
