import { database } from "@/platform/persistence/prisma";

export async function resolveStoreContext(userId: string, requestedStoreId?: string) {
  const membership = await database().storeMembership.findFirst({
    where: { userId, status: "ACTIVE", ...(requestedStoreId ? { storeId: requestedStoreId } : {}) },
    orderBy: { createdAt: "asc" },
    include: { store: true },
  });
  return membership ? { store: membership.store, role: membership.role } : null;
}
