# ADR 0013 — SaaS readiness boundaries

Status: accepted, 2026-08-09.

## Decision

TINDAHAN represents store access with a provider-neutral `StoreSubscription` state machine. The application recognizes trialing, active, grace, restricted, and canceled states. Active trials, paid/pilot access, and grace may write. Restricted and canceled stores retain authenticated read and export access but business mutations are rejected by a centralized application policy.

Billing provider details stay in Infrastructure. The initial `manual` adapter is an operator-controlled pilot target, not a simulated payment provider or checkout. A future payment adapter may produce validated state transitions without changing Inventory, Sales, Receipts, or presentation modules.

Staff access uses expiring, cryptographically random invitation tokens. Only a SHA-256 token hash is persisted. Acceptance is one-time and transactionally creates or activates one store-scoped Staff membership. Owner authorization is checked server-side for invitation creation, revocation, store preferences, receipt retention, and plan visibility.

Receipt retention controls the `retentionUntil` metadata assigned to future receipt photos. It never deletes structured receipt, confirmation, audit, or inventory history. Physical-object lifecycle execution remains an infrastructure operation and must preserve the approved private-storage boundary.

## Consequences

- Existing stores are backfilled as active pilot stores; new stores receive a configurable trial.
- Core reads and CSV export do not depend on a writable plan.
- Inventory, sales, and receipt mutation entry points enforce the same plan policy.
- Operators use an audited CLI for pilot state changes until a real billing provider is approved.
- No payment credentials, provider jargon, plan internals, or invitation tokens are exposed beyond their required server/user boundary.
