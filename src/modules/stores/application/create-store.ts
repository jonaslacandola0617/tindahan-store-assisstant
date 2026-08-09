import { database } from "@/platform/persistence/prisma";
import { storeInput } from "../domain/store";
import { serverEnvironment } from "@/platform/environment/server";

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
          plan: "TRIAL",
          status: "TRIALING",
          trialEndsAt: new Date(Date.now() + serverEnvironment.TRIAL_DAYS * 86_400_000),
        },
      },
    },
    select: { id: true, name: true },
  });
}
