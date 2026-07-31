export const productUnits = ["PIECE", "PACK", "SACHET", "BOTTLE", "CAN", "BOX", "DOZEN", "GRAM", "KILOGRAM", "MILLILITER", "LITER", "SACK", "CASE", "TRAY", "OTHER"] as const;
export type ProductUnitValue = (typeof productUnits)[number];

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-PH");
}

export function unitDetails(unit: ProductUnitValue, otherUnitRaw?: string | null) {
  if (unit !== "OTHER") return { otherUnitRaw: null, needsUnitCanonicalization: false };
  const raw = otherUnitRaw?.trim();
  if (!raw) throw new Error("OTHER_UNIT_REQUIRED");
  return { otherUnitRaw: raw, needsUnitCanonicalization: true };
}

export function canUseOperationalProduct(status: "ACTIVE" | "ARCHIVED") {
  return status === "ACTIVE";
}
