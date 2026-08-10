import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/platform/persistence/prisma";
import { serverEnvironment } from "@/platform/environment/server";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { hashPassword, verifyPassword } from "@/modules/identity/domain/password";
import { effectivePlanState, entitlementsFor, mayWriteBusinessData, type PlanState } from "../domain/subscription";
import { deliverEmail, invitationAcceptedEmail, staffInvitationEmail } from "./transactional-email";
import { passwordChangeInput, settingsInput } from "../domain/settings";
import { SaasError } from "./errors";
const inviteInput = z.object({ email: z.string().trim().toLowerCase().email() });
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
    role === "OWNER" ? database().staffInvitation.findMany({ where: { storeId: store.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { id: true, email: true, expiresAt: true, createdAt: true, emailDeliveries: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } }) : Promise.resolve([]),
  ]);
  return { role, user, store: { name: store.name, storeType: store.storeType, address: store.address, contact: store.contact }, preference, subscription: { plan: subscription.plan, status: subscription.status, trialEndsAt: subscription.trialEndsAt, currentPeriodEndsAt: subscription.currentPeriodEndsAt, graceEndsAt: subscription.graceEndsAt, onlineBillingAvailable: false }, members, invitations: invitations.map(invitation => ({ ...invitation, emailStatus: invitation.emailDeliveries[0]?.status ?? null, emailDeliveries: undefined })) };
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
  const value = passwordChangeInput.parse(raw); const user = await database().user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !await verifyPassword(value.currentPassword, user.passwordHash)) throw new SaasError("CURRENT_PASSWORD", "The current password is incorrect.", 400);
  const { store } = await contextFor(userId);
  const passwordHash = await hashPassword(value.newPassword);
  await database().$transaction(async transaction => {
    await transaction.user.update({ where: { id: userId }, data: { passwordHash } });
    await transaction.auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "PASSWORD_CHANGED", entityType: "User", entityId: userId, correlationId: randomUUID() } });
  });
  return { ok: true };
}

export async function inviteStaff(userId: string, origin: string, raw: unknown) {
  const value = inviteInput.parse(raw); const { store, role } = await contextFor(userId); requireOwner(role);
  const subscription = await currentSubscription(store.id); if (!entitlementsFor(subscription.status as PlanState).staffInvitations) throw new SaasError("PLAN_RESTRICTED", "Staff invitations are paused while the plan needs attention.", 403);
  const existing = await database().storeMembership.findFirst({ where: { storeId: store.id, user: { email: value.email }, status: { in: ["ACTIVE", "INVITED"] } } });
  if (existing) throw new SaasError("ALREADY_MEMBER", "This person already belongs to your store.", 409);
  await database().staffInvitation.updateMany({ where: { storeId: store.id, email: value.email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  const token = randomBytes(32).toString("base64url");
  const invitation = await database().staffInvitation.create({ data: { storeId: store.id, invitedById: userId, email: value.email, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + serverEnvironment.STAFF_INVITE_TTL_DAYS * 86_400_000) }, select: { id: true, email: true, expiresAt: true } });
  await database().auditEvent.create({ data: { storeId: store.id, actorId: userId, action: "STAFF_INVITED", entityType: "StaffInvitation", entityId: invitation.id, correlationId: randomUUID(), after: { email: invitation.email, expiresAt: invitation.expiresAt.toISOString() } } });
  const inviter = await database().user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
  const inviteUrl = `${(serverEnvironment.APP_URL ?? origin).replace(/\/$/, "")}/invite/${token}`;
  const delivery = await deliverEmail({ storeId: store.id, userId, invitationId: invitation.id, kind: "STAFF_INVITATION", recipient: invitation.email, idempotencyKey: `staff-invitation-${invitation.id}`, email: staffInvitationEmail(store.name, inviter.name || inviter.email, inviteUrl) });
  return { ...invitation, inviteUrl, emailStatus: delivery.status };
}

export async function resendStaffInvitation(userId: string, origin: string, invitationId: string) {
  const { store, role } = await contextFor(userId); requireOwner(role);
  const previous = await database().staffInvitation.findFirst({ where: { id: invitationId, storeId: store.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { email: true } });
  if (!previous) throw new SaasError("NOT_FOUND", "Invitation not found.", 404);
  await database().staffInvitation.update({ where: { id: invitationId }, data: { revokedAt: new Date() } });
  return inviteStaff(userId, origin, { email: previous.email });
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
  const invitation = await database().staffInvitation.findUnique({ where: { tokenHash: hash }, include: { store: { select: { name: true } }, invitedBy: { select: { id: true, email: true } } } });
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
  await deliverEmail({ storeId: invitation.storeId, userId: invitation.invitedBy.id, invitationId: invitation.id, kind: "STAFF_INVITATION_ACCEPTED", recipient: invitation.invitedBy.email, idempotencyKey: `staff-invitation-accepted-${invitation.id}`, email: invitationAcceptedEmail(invitation.store.name, value.name || invitation.email) });
  return { ok: true, storeName: invitation.store.name, email: invitation.email };
}
