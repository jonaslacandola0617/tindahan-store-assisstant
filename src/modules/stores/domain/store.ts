import { z } from "zod";

export const storeTypes = [
  "Sari-sari store",
  "Mini-mart",
  "Convenience store",
  "Other small store",
] as const;

export const storeInput = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(240).optional(),
  contact: z.string().trim().max(80).optional(),
  language: z.enum(["EN", "FIL"]).default("EN"),
  lowStockEnabled: z.boolean().default(true),
  dailySummaryEnabled: z.boolean().default(true),
  storeType: z.enum(storeTypes).default("Sari-sari store"),
});

