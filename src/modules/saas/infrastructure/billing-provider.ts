import type { PlanState } from "../domain/subscription";

export type BillingTransition = { status: PlanState; currentPeriodEndsAt?: Date | null; graceEndsAt?: Date | null };

export interface BillingProvider {
  readonly id: "manual";
  validateTransition(input: BillingTransition): BillingTransition;
}

class ManualPilotBillingProvider implements BillingProvider {
  readonly id = "manual" as const;
  validateTransition(input: BillingTransition) { return input; }
}

const provider = new ManualPilotBillingProvider();
export function billingProvider(): BillingProvider { return provider; }
