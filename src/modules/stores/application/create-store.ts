import { z } from "zod";
import { database } from "@/platform/persistence/prisma";

export const storeInput = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().max(240).optional(),
  contact: z.string().trim().max(80).optional(),
  language: z.enum(["EN", "FIL"]).default("EN"),
});

export async function createStoreForOwner(userId: string, input: unknown) {
  const value = storeInput.parse(input);
  return database().store.create({
    data: {
      name: value.name,
      address: value.address || null,
      contact: value.contact || null,
      preference: { create: { defaultLanguage: value.language } },
      memberships: { create: { userId, role: "OWNER", status: "ACTIVE" } },
    },
    select: { id: true, name: true },
  });
}
