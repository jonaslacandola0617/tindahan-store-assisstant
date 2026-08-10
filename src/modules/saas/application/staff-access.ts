import { randomUUID } from "node:crypto";
import { resolveStoreContext } from "@/modules/stores/application/store-context";
import { database } from "@/platform/persistence/prisma";
import { SaasError } from "./errors";

export async function removeStaffAccess(ownerUserId: string, membershipId: string) {
  const context = await resolveStoreContext(ownerUserId);
  if (!context) throw new SaasError("FORBIDDEN", "You do not have access to a store.", 403);
  if (context.role !== "OWNER") throw new SaasError("OWNER_REQUIRED", "Only the store owner can remove staff access.", 403);

  const member = await database().storeMembership.findFirst({
    where: { id: membershipId, storeId: context.store.id, role: "STAFF", status: "ACTIVE" },
    select: { id: true, userId: true, user: { select: { email: true, name: true } } },
  });
  if (!member) throw new SaasError("NOT_FOUND", "Active staff member not found.", 404);

  const correlationId = randomUUID();
  await database().$transaction(async transaction => {
    const changed = await transaction.storeMembership.updateMany({
      where: { id: member.id, storeId: context.store.id, role: "STAFF", status: "ACTIVE" },
      data: { status: "DISABLED" },
    });
    if (changed.count !== 1) throw new SaasError("NOT_FOUND", "Active staff member not found.", 404);

    await transaction.staffInvitation.updateMany({
      where: { storeId: context.store.id, email: member.user.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await transaction.auditEvent.create({
      data: {
        storeId: context.store.id,
        actorId: ownerUserId,
        action: "STAFF_ACCESS_REMOVED",
        entityType: "StoreMembership",
        entityId: member.id,
        correlationId,
        before: { status: "ACTIVE", email: member.user.email },
        after: { status: "DISABLED" },
      },
    });
  });

  return { ok: true, membershipId: member.id, email: member.user.email, name: member.user.name };
}
