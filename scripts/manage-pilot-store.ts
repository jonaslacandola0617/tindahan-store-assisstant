import { randomUUID } from "node:crypto";
import { database } from "../src/platform/persistence/prisma";
import { billingProvider } from "../src/modules/saas/infrastructure/billing-provider";

const args = new Map(process.argv.slice(2).map(value => { const [key, ...rest] = value.split("="); return [key, rest.join("=")]; }));
const email = args.get("--email")?.trim().toLowerCase();
const requested = args.get("--status")?.trim().toUpperCase();
const statuses = ["TRIALING", "ACTIVE", "GRACE", "RESTRICTED", "CANCELED"] as const;
if (!email || !statuses.includes(requested as typeof statuses[number])) throw new Error("Usage: pnpm pilot:store --email=owner@example.com --status=ACTIVE");

async function main() {
  const db = database();
  if (billingProvider().id !== "manual") throw new Error("Pilot transitions are disabled while online billing is configured.");
  const membership = await db.storeMembership.findFirst({ where: { role: "OWNER", status: "ACTIVE", user: { email } }, include: { store: true } });
  if (!membership) throw new Error("No active owner store was found for that email.");
  const transition = billingProvider().validateTransition({ status: requested as typeof statuses[number] });
  const subscription = await db.storeSubscription.upsert({ where: { storeId: membership.storeId }, update: { status: transition.status, plan: transition.status === "TRIALING" ? "TRIAL" : "PILOT", graceEndsAt: transition.graceEndsAt }, create: { storeId: membership.storeId, status: transition.status, plan: transition.status === "TRIALING" ? "TRIAL" : "PILOT", graceEndsAt: transition.graceEndsAt } });
  await db.auditEvent.create({ data: { storeId: membership.storeId, action: "PILOT_PLAN_STATUS_CHANGED", entityType: "StoreSubscription", entityId: subscription.id, correlationId: randomUUID(), after: { status: subscription.status, plan: subscription.plan } } });
  console.info(`Updated plan state for ${membership.store.name}: ${subscription.status}.`);
}

main().finally(() => database().$disconnect());
