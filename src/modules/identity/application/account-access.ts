import { database } from "@/platform/persistence/prisma";

export type AccountAccessState = "ACTIVE" | "DISABLED" | "UNATTACHED";

export async function accountAccessState(userId: string): Promise<AccountAccessState> {
  const memberships = await database().storeMembership.findMany({
    where: { userId },
    select: { status: true },
  });
  if (memberships.some(membership => membership.status === "ACTIVE")) return "ACTIVE";
  if (memberships.some(membership => membership.status === "DISABLED")) return "DISABLED";
  return "UNATTACHED";
}
