import { database } from "@/platform/persistence/prisma";
import { storeInput } from "../domain/store";

export async function createStoreForOwner(userId: string, input: unknown) {
  const value = storeInput.parse(input);
  return database().store.create({
    data: {
      name: value.name,
      storeType: value.storeType,
      address: value.address || null,
      contact: value.contact || null,
      preference: { create: { defaultLanguage: value.language, lowStockEnabled: value.lowStockEnabled, dailySummaryEnabled: value.dailySummaryEnabled } },
      memberships: { create: { userId, role: "OWNER", status: "ACTIVE" } },
      subscription: {
        create: {
          plan: "PILOT",
          status: "ACTIVE",
        },
      },
    },
    select: { id: true, name: true },
  });
}
