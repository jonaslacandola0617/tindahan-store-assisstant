import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { hashPassword, verifyPassword } from "@/modules/identity/domain/password";
import { effectivePlanState, mayWriteBusinessData, type PlanState } from "../domain/subscription";
import { SaasError } from "./errors";

const settingsInput = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(40).optional().nullable(),
  storeName: z.string().trim().min(2).max(100).optional(),
  storeType: z.enum(["Sari-sari store", "Mini-mart", "Convenience store", "Other small store"]).optional(),
  address: z.string().trim().max(240).optional().nullable(),
  contact: z.string().trim().max(80).optional().nullable(),
  language: z.enum(["EN", "FIL"]),
  theme: z.enum(["SYSTEM", "LIGHT", "DARK"]),
  lowStockEnabled: z.boolean(),
  dailySummaryEnabled: z.boolean(),
  receiptNotifications: z.boolean(),
  receiptRetentionDays: z.union([z.literal(365), z.literal(1095), z.literal(2555)]),
});
const inviteInput = z.object({ email: z.string().trim().toLowerCase().email() });
const passwordInput = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) });
const acceptInput = z.object({ token: z.string().min(32), name: z.string().trim().min(2).max(100).optional(), password: z.string().min(10).max(128).optional() });

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
async function contextFor(userId: string) {
  const context = await resolveStoreContext(userId);
  if (!context) throw new SaasError("FORBIDDEN", "You do not have access to a store.", 403);
  return context;
}
function requireOwner(role: string) { if (role !== "OWNER") throw new SaasError("OWNER_REQUIRED", "Only the store owner can change this setting.", 403); }

async function currentSubscription(storeId: string) {
  const db = database();
  let subscription = await db.storeSubscription.findUnique({ where: { storeId } });
  subscription ??= await db.storeSubscription.create({ data: { storeId, plan: "PILOT", status: "ACTIVE" } });
  const effective = effectivePlanState(subscription, new Date(), serverEnvironment.BILLING_GRACE_DAYS);
  if (effective.status !== subscription.status || effective.graceEndsAt?.getTime() !== subscription.graceEndsAt?.getTime()) {
    subscription = await db.storeSubscription.update({ where: { storeId }, data: { status: effective.status, graceEndsAt: effective.graceEndsAt } });
  }
  return subscription;
}

export async function assertStoreMayWrite(storeId: string) {
  const subscription = await currentSubscription(storeId);
  if (!mayWriteBusinessData(subscription.status as PlanState)) throw new SaasError("PLAN_RESTRICTED", "Your store is in read-only mode. Contact support to restore changes.", 403);
}

export async function getSettings(userId: string) {
  const { store, role } = await contextFor(userId);
  const [user, preference, subscription, members, invitations] = await Promise.all([
    database().user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, phone: true, preferredLanguage: true, preferredTheme: true } }),
    database().storePreference.upsert({ where: { storeId: store.id }, update: {}, create: { storeId: store.id } }),
    currentSubscription(store.id),
    database().storeMembership.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "asc" }, select: { id: true, role: true, status: true, user: { select: { name: true, email: true } } } }),
    role === "OWNER" ? database().staffInvitation.findMany({ where: { storeId: store.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { id: true, email: true, expiresAt: true, createdAt: true } }) : Promise.resolve([]),
  ]);
  return { role, user, store: { name: store.name, storeType: store.storeType, address: store.address, contact: store.contact }, preference, subscription: { plan: subscription.plan, status: subscription.status, trialEndsAt: subscription.trialEndsAt, currentPeriodEndsAt: subscription.currentPeriodEndsAt, graceEndsAt: subscription.graceEndsAt }, members, invitations };
}

export async function updateSettings(userId: string, raw: unknown) {
  const value = settingsInput.parse(raw); const { store, role } = await contextFor(userId);
  await database().$transaction(async tx => {
    await tx.user.update({ where: { id: userId }, data: { name: value.name, phone: value.phone || null, preferredLanguage: value.language, preferredTheme: value.theme } });
    if (role === "OWNER") {
      await tx.storePreference.upsert({ where: { storeId: store.id }, update: { defaultLanguage: value.language, defaultTheme: value.theme, lowStockEnabled: value.lowStockEnabled, dailySummaryEnabled: value.dailySummaryEnabled, receiptNotifications: value.receiptNotifications, receiptRetentionDays: value.receiptRetentionDays }, create: { storeId: store.id, defaultLanguage: value.language, defaultTheme: value.theme, lowStockEnabled: value.lowStockEnabled, dailySummaryEnabled: value.dailySummaryEnabled, receiptNotifications: value.receiptNotifications, receiptRetentionDays: value.receiptRetentionDays } });
      await tx.store.update({ where: { id: store.id }, data: { name: value.storeName, storeType: value.storeType, address: value.address || null, contact: value.contact || null } });
    }
    await tx.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "SETTINGS_UPDATED", entityType: "Store", entityId: store.id, correlationId: randomUUID(), after: { account: true, store: role === "OWNER", storePreferences: role === "OWNER", ...(role === "OWNER" ? { receiptRetentionDays: value.receiptRetentionDays } : {}) } } });
  });
  return { ok: true };
}

export async function changePassword(userId: string, raw: unknown) {
  const value = passwordInput.parse(raw); const user = await database().user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !await verifyPassword(value.currentPassword, user.passwordHash)) throw new SaasError("CURRENT_PASSWORD", "The current password is incorrect.", 400);
  await database().user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(value.newPassword) } });
  return { ok: true };
}

export async function inviteStaff(userId: string, origin: string, raw: unknown) {
  const value = inviteInput.parse(raw); const { store, role } = await contextFor(userId); requireOwner(role);
  const existing = await database().storeMembership.findFirst({ where: { storeId: store.id, user: { email: value.email }, status: { in: ["ACTIVE", "INVITED"] } } });
  if (existing) throw new SaasError("ALREADY_MEMBER", "This person already belongs to your store.", 409);
  await database().staffInvitation.updateMany({ where: { storeId: store.id, email: value.email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  const token = randomBytes(32).toString("base64url");
  const invitation = await database().staffInvitation.create({ data: { storeId: store.id, invitedById: userId, email: value.email, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + serverEnvironment.STAFF_INVITE_TTL_DAYS * 86_400_000) }, select: { id: true, email: true, expiresAt: true } });
  await database().auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "STAFF_INVITED", entityType: "StaffInvitation", entityId: invitation.id, correlationId: randomUUID(), after: { email: invitation.email, expiresAt: invitation.expiresAt.toISOString() } } });
  return { ...invitation, inviteUrl: `${origin.replace(/\/$/, "")}/invite/${token}` };
}

export async function revokeStaffInvitation(userId: string, invitationId: string) {
  const { store, role } = await contextFor(userId); requireOwner(role);
  const changed = await database().staffInvitation.updateMany({ where: { id: invitationId, storeId: store.id, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!changed.count) throw new SaasError("NOT_FOUND", "Invitation not found.", 404);
  return { ok: true };
}

export async function invitationPreview(token: string) {
  const invitation = await database().staffInvitation.findUnique({ where: { tokenHash: tokenHash(token) }, select: { email: true, expiresAt: true, acceptedAt: true, revokedAt: true, store: { select: { name: true } } } });
  if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new SaasError("INVITE_INVALID", "This invitation is no longer available.", 410);
  return invitation;
}

export async function acceptStaffInvitation(currentUserId: string | null, raw: unknown) {
  const value = acceptInput.parse(raw); const hash = tokenHash(value.token);
  const invitation = await database().staffInvitation.findUnique({ where: { tokenHash: hash }, include: { store: { select: { name: true } } } });
  if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new SaasError("INVITE_INVALID", "This invitation is no longer available.", 410);
  let passwordHash: string | null = null;
  if (currentUserId) {
    const user = await database().user.findUniqueOrThrow({ where: { id: currentUserId }, select: { email: true } });
    if (user.email !== invitation.email) throw new SaasError("EMAIL_MISMATCH", `Sign in with ${invitation.email} to accept this invitation.`, 403);
  } else {
    const existing = await database().user.findUnique({ where: { email: invitation.email } });
    if (existing) throw new SaasError("SIGN_IN_REQUIRED", "Sign in with the invited email, then open this invitation again.", 409);
    if (!value.name || !value.password) throw new SaasError("ACCOUNT_DETAILS", "Enter your name and create a password.", 400);
    passwordHash = await hashPassword(value.password);
  }
  await database().$transaction(async tx => {
    const accepted = await tx.staffInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, data: { acceptedAt: new Date() } });
    if (accepted.count !== 1) throw new SaasError("INVITE_INVALID", "This invitation is no longer available.", 410);
    const userId = currentUserId ?? (await tx.user.create({ data: { email: invitation.email, name: value.name!, passwordHash: passwordHash! }, select: { id: true } })).id;
    await tx.storeMembership.upsert({ where: { storeId_userId: { storeId: invitation.storeId, userId } }, update: { role: "STAFF", status: "ACTIVE" }, create: { storeId: invitation.storeId, userId, role: "STAFF", status: "ACTIVE" } });
    await tx.auditEvent.create({ data: { storeId: invitation.storeId, actorId: userId, action: "STAFF_INVITATION_ACCEPTED", entityType: "StaffInvitation", entityId: invitation.id, correlationId: randomUUID() } });
  }, { isolationLevel: "Serializable" });
  return { ok: true, storeName: invitation.store.name, email: invitation.email };
}
