import { database } from "@/platform/persistence/prisma";

export async function registeredUserExists(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  return Boolean(await database().user.findUnique({ where: { id: userId }, select: { id: true } }));
}
