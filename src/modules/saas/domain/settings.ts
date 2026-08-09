import { z } from "zod";

export const receiptRetentionOptions = [90, 180, 365] as const;
export type ReceiptRetentionDays = (typeof receiptRetentionOptions)[number];

const phonePattern = /^\+?[0-9][0-9 ()-]*$/;

export function isPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const digitCount = trimmed.replace(/\D/g, "").length;
  return phonePattern.test(trimmed) && digitCount >= 7 && digitCount <= 15;
}

export function sanitizePhoneInput(value: string): string {
  const permitted = value.replace(/[^0-9+() -]/g, "");
  return permitted.replace(/(?!^)\+/g, "").slice(0, 24);
}

const optionalPhone = z.string().trim().max(24).refine(isPhoneNumber, "Enter a valid phone number using digits and common phone separators.").optional().nullable();

export const settingsInput = z.object({
  name: z.string().trim().min(2).max(100),
  phone: optionalPhone,
  storeName: z.string().trim().min(2).max(100).optional(),
  storeType: z.enum(["Sari-sari store", "Mini-mart", "Convenience store", "Other small store"]).optional(),
  address: z.string().trim().max(240).optional().nullable(),
  contact: optionalPhone,
  language: z.enum(["EN", "FIL"]),
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]),
  lowStockEnabled: z.boolean(),
  dailySummaryEnabled: z.boolean(),
  receiptNotifications: z.boolean(),
  receiptRetentionDays: z.union([z.literal(90), z.literal(180), z.literal(365)]),
});

export const passwordChangeInput = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
  confirmPassword: z.string().min(1).max(128),
}).superRefine((value, context) => {
  if (value.newPassword !== value.confirmPassword) {
    context.addIssue({ code: "custom", path: ["confirmPassword"], message: "The new passwords do not match." });
  }
  if (value.currentPassword === value.newPassword) {
    context.addIssue({ code: "custom", path: ["newPassword"], message: "Choose a password different from your current password." });
  }
});

