export type PlanState = "TRIALING" | "ACTIVE" | "GRACE" | "RESTRICTED" | "CANCELED";

export function effectivePlanState(input: {
  status: PlanState;
  trialEndsAt?: Date | null;
  graceEndsAt?: Date | null;
}, now = new Date(), graceDays = 7): { status: PlanState; graceEndsAt?: Date } {
  if (input.status === "TRIALING" && input.trialEndsAt && now > input.trialEndsAt) {
    const graceEndsAt = input.graceEndsAt ?? new Date(input.trialEndsAt.getTime() + graceDays * 86_400_000);
    return { status: now > graceEndsAt ? "RESTRICTED" : "GRACE", graceEndsAt };
  }
  if (input.status === "GRACE" && input.graceEndsAt && now > input.graceEndsAt) return { status: "RESTRICTED" };
  return { status: input.status, ...(input.graceEndsAt ? { graceEndsAt: input.graceEndsAt } : {}) };
}

export function mayWriteBusinessData(status: PlanState) {
  return status === "TRIALING" || status === "ACTIVE" || status === "GRACE";
}
