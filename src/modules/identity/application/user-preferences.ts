import { database } from "@/platform/persistence/prisma";

export async function getUserPresentationPreferences(userId: string) {
  return database().user.findUniqueOrThrow({
    where: { id: userId },
    select: { preferredLanguage: true, preferredTheme: true },
  });
}
