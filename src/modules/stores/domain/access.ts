export type Membership = { storeId: string; role: "OWNER" | "STAFF"; status: "ACTIVE" | "INVITED" | "DISABLED" };

export function activeMembershipForStore(memberships: readonly Membership[], storeId?: string) {
  const active = memberships.filter((membership) => membership.status === "ACTIVE");
  return (storeId ? active.find((membership) => membership.storeId === storeId) : active[0]) ?? null;
}

export function canManageStore(role: Membership["role"]) {
  return role === "OWNER";
}
