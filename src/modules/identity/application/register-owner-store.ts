import { z } from "zod";
import { database } from "@/platform/persistence/prisma";
import { storeInput } from "@/modules/stores/domain/store";
import { hashPassword } from "../domain/password";
import { registrationInput } from "../domain/registration";

export const ownerStoreRegistrationInput = z.object({
  account: registrationInput,
  store: storeInput,
});

export async function registerOwnerStore(input: unknown) {
  const value = ownerStoreRegistrationInput.parse(input);
  const passwordHash = await hashPassword(value.account.password);

  return database().$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        name: value.account.name,
        email: value.account.email,
        passwordHash,
      },
      select: { id: true, name: true, email: true },
    });
    const store = await transaction.store.create({
      data: {
        name: value.store.name,
        storeType: value.store.storeType,
        address: value.store.address || null,
        contact: value.store.contact || null,
        preference: {
          create: {
            defaultLanguage: value.store.language,
            lowStockEnabled: value.store.lowStockEnabled,
            dailySummaryEnabled: value.store.dailySummaryEnabled,
          },
        },
        memberships: { create: { userId: user.id, role: "OWNER", status: "ACTIVE" } },
        subscription: { create: { plan: "PILOT", status: "ACTIVE" } },
      },
      select: { id: true, name: true },
    });
    return { user, store };
  }, { maxWait: 10_000, timeout: 30_000 });
}
