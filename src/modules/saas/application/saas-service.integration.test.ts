import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { database } from "@/platform/persistence/prisma";
import { hashPassword } from "@/modules/identity/domain/password";
import { acceptStaffInvitation, assertStoreMayWrite, changePassword, invitationPreview, inviteStaff, revokeStaffInvitation, updateSettings } from "./saas-service";
import { verifyPassword } from "@/modules/identity/domain/password";

const databaseTests = process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE ? describe : describe.skip;

databaseTests("Phase 7 staff invitation integration", () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ownerEmail = `phase7-owner-${suffix}@example.test`;
  const staffEmail = `phase7-staff-${suffix}@example.test`;
  let ownerId = ""; let storeId = ""; let staffId = "";
  beforeAll(async () => {
    const owner = await database().user.create({ data: { email: ownerEmail, name: "Phase Seven Owner", passwordHash: await hashPassword("Tindahan-Phase7!") } }); ownerId = owner.id;
    const store = await database().store.create({ data: { name: "Phase Seven Store", memberships: { create: { userId: owner.id, role: "OWNER", status: "ACTIVE" } }, preference: { create: {} }, subscription: { create: { plan: "PILOT", status: "ACTIVE" } } } }); storeId = store.id;
  });
  afterAll(async () => { if (storeId) { await database().auditEvent.deleteMany({ where: { storeId } }); await database().store.deleteMany({ where: { id: storeId } }); } if (staffId) await database().user.deleteMany({ where: { id: staffId } }); if (ownerId) await database().user.deleteMany({ where: { id: ownerId } }); });

  it("stores only a token hash and accepts a store-scoped invitation once", async () => {
    const invited = await inviteStaff(ownerId, "https://tindahan.example.test", { email: staffEmail });
    const token = invited.inviteUrl.split("/").at(-1)!;
    expect((await invitationPreview(token)).email).toBe(staffEmail);
    const stored = await database().staffInvitation.findUniqueOrThrow({ where: { id: invited.id } });
    expect(stored.tokenHash).not.toContain(token);
    const accepted = await acceptStaffInvitation(null, { token, name: "Phase Seven Staff", password: "Tindahan-Staff-2026!" });
    expect(accepted.storeName).toBe("Phase Seven Store");
    const member = await database().storeMembership.findFirstOrThrow({ where: { storeId, user: { email: staffEmail } } }); staffId = member.userId;
    expect(member).toMatchObject({ role: "STAFF", status: "ACTIVE" });
    await expect(acceptStaffInvitation(null, { token, name: "Again", password: "Tindahan-Staff-2026!" })).rejects.toMatchObject({ code: "INVITE_INVALID" });
  });

  it("lets an owner revoke a pending invitation", async () => {
    const invited = await inviteStaff(ownerId, "https://tindahan.example.test", { email: `revoked-${staffEmail}` });
    await expect(revokeStaffInvitation(ownerId, invited.id)).resolves.toEqual({ ok: true });
    await expect(invitationPreview(invited.inviteUrl.split("/").at(-1)!)).rejects.toMatchObject({ code: "INVITE_INVALID" });
  });

  it("allows Staff to update their account without changing owner-only store preferences", async () => {
    await updateSettings(staffId, { name: "Updated Staff", phone: "09170000000", language: "FIL", theme: "DARK", lowStockEnabled: false, dailySummaryEnabled: false, receiptNotifications: false, receiptRetentionDays: 365 });
    expect(await database().user.findUnique({ where: { id: staffId }, select: { name: true, preferredLanguage: true, preferredTheme: true } })).toEqual({ name: "Updated Staff", preferredLanguage: "FIL", preferredTheme: "DARK" });
    expect(await database().storePreference.findUnique({ where: { storeId }, select: { lowStockEnabled: true, receiptRetentionDays: true } })).toEqual({ lowStockEnabled: true, receiptRetentionDays: 365 });
  });

  it("changes a password only after current-password and confirmation checks", async () => {
    await expect(changePassword(ownerId, { currentPassword: "wrong", newPassword: "New-Tindahan-2026!", confirmPassword: "New-Tindahan-2026!" })).rejects.toMatchObject({ code: "CURRENT_PASSWORD" });
    await expect(changePassword(ownerId, { currentPassword: "Tindahan-Phase7!", newPassword: "New-Tindahan-2026!", confirmPassword: "different" })).rejects.toBeDefined();
    await expect(changePassword(ownerId, { currentPassword: "Tindahan-Phase7!", newPassword: "New-Tindahan-2026!", confirmPassword: "New-Tindahan-2026!" })).resolves.toEqual({ ok: true });
    const passwordHash = (await database().user.findUniqueOrThrow({ where: { id: ownerId }, select: { passwordHash: true } })).passwordHash!;
    await expect(verifyPassword("Tindahan-Phase7!", passwordHash)).resolves.toBe(false);
    await expect(verifyPassword("New-Tindahan-2026!", passwordHash)).resolves.toBe(true);
  });

  it("keeps restricted stores readable while centrally rejecting business writes", async () => {
    await database().storeSubscription.update({ where: { storeId }, data: { status: "RESTRICTED" } });
    await expect(assertStoreMayWrite(storeId)).rejects.toMatchObject({ code: "PLAN_RESTRICTED", status: 403 });
    expect(await database().store.findUnique({ where: { id: storeId }, select: { name: true } })).toEqual({ name: "Phase Seven Store" });
    await database().storeSubscription.update({ where: { storeId }, data: { status: "ACTIVE" } });
  });
});
