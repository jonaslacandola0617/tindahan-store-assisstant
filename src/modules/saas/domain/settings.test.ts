import { describe, expect, it } from "vitest";
import { isPhoneNumber, passwordChangeInput, sanitizePhoneInput, settingsInput } from "./settings";

const validSettings = {
  name: "Rosa Santos", phone: "0917 123 4567", storeName: "Rosa Store", storeType: "Sari-sari store",
  address: "Bulacan", contact: "+63 (2) 8123-4567", language: "EN", theme: "DARK",
  lowStockEnabled: true, dailySummaryEnabled: true, receiptNotifications: true, receiptRetentionDays: 180,
};

describe("settings validation", () => {
  it("accepts practical phone formats and rejects arbitrary text", () => {
    expect(isPhoneNumber("0917 123 4567")).toBe(true);
    expect(isPhoneNumber("+63 (2) 8123-4567")).toBe(true);
    expect(isPhoneNumber("call the shop")).toBe(false);
    expect(settingsInput.safeParse(validSettings).success).toBe(true);
    expect(settingsInput.safeParse({ ...validSettings, contact: "phone 1234567" }).success).toBe(false);
  });

  it("removes non-phone characters while typing", () => {
    expect(sanitizePhoneInput("09abc17 123-4567")).toBe("0917 123-4567");
  });

  it("allows only the approved receipt retention periods", () => {
    expect(settingsInput.safeParse({ ...validSettings, receiptRetentionDays: 90 }).success).toBe(true);
    expect(settingsInput.safeParse({ ...validSettings, receiptRetentionDays: 365 }).success).toBe(true);
    expect(settingsInput.safeParse({ ...validSettings, receiptRetentionDays: 1095 }).success).toBe(false);
  });

  it("requires a distinct, confirmed new password", () => {
    expect(passwordChangeInput.safeParse({ currentPassword: "Current-2026!", newPassword: "Different-2026!", confirmPassword: "Different-2026!" }).success).toBe(true);
    expect(passwordChangeInput.safeParse({ currentPassword: "Current-2026!", newPassword: "Different-2026!", confirmPassword: "Mismatch-2026!" }).success).toBe(false);
    expect(passwordChangeInput.safeParse({ currentPassword: "Current-2026!", newPassword: "Current-2026!", confirmPassword: "Current-2026!" }).success).toBe(false);
  });
});
