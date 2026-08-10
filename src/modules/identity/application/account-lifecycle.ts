import { randomUUID } from "node:crypto";
import { z } from "zod";
import { verifyPassword } from "@/modules/identity/domain/password";
import { SaasError } from "@/modules/saas/application/errors";
import { database } from "@/platform/persistence/prisma";

const deactivateInput = z.object({ currentPassword: z.string().min(1).max(128) });

export async function deactivateAccount(userId: string, raw: unknown) {
  const value = deactivateInput.parse(raw);
  const user = await database().user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, memberships: { where: { status: "ACTIVE" }, select: { id: true, storeId: true, role: true } } },
  });
  if (!user?.passwordHash || !await verifyPassword(value.currentPassword, user.passwordHash)) {
    throw new SaasError("CURRENT_PASSWORD", "The current password is incorrect.", 400);
  }
  if (!user.memberships.length) throw new SaasError("ACCOUNT_INACTIVE", "This account is already inactive.", 409);

  const ownedStoreIds = user.memberships.filter(membership => membership.role === "OWNER").map(membership => membership.storeId);
  if (ownedStoreIds.length) {
    const activeStaff = await database().storeMembership.count({
      where: { storeId: { in: ownedStoreIds }, role: "STAFF", status: "ACTIVE" },
    });
    if (activeStaff > 0) {
      throw new SaasError("ACTIVE_STAFF", "Remove active staff access before deactivating an owner account.", 409);
    }
  }

  const correlationId = randomUUID();
  await database().$transaction(async transaction => {
    await transaction.storeMembership.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "DISABLED" },
    });

    if (ownedStoreIds.length) {
      await transaction.staffInvitation.updateMany({
        where: { storeId: { in: ownedStoreIds }, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    for (const membership of user.memberships) {
      await transaction.auditEvent.create({
        data: {
          storeId: membership.storeId,
          actorId: userId,
          action: "ACCOUNT_DEACTIVATED",
          entityType: "User",
          entityId: userId,
          correlationId,
          before: { membershipStatus: "ACTIVE", role: membership.role },
          after: { membershipStatus: "DISABLED" },
        },
      });
    }
  });

  return { ok: true };
}
