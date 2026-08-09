# ADR 0015: production billing, transactional email, and physical retention

Status: Accepted — 2026-08-09

## Decision

TINDAHAN keeps commercial access provider-neutral in the application and domain layers. Xendit is the production recurring-billing adapter; Xendit identifiers remain infrastructure metadata and webhook confirmation is authoritative. Browser return URLs never activate a plan. Resend is the production transactional-email adapter. A deterministic mock adapter remains available only for tests and explicit development, while manual billing remains an operator-only pilot target.

The supported commercial catalog remains `TRIAL`, `PILOT`, and `STANDARD`. No unapproved price or extra tier is hard-coded. The Standard monthly amount is required deployment configuration when Xendit is selected. Subscription state is `TRIALING`, `ACTIVE`, `GRACE`, `RESTRICTED`, or `CANCELED`; entitlements depend only on that internal state.

Billing webhooks authenticate with the configured callback token, use provider event identifiers or deterministic payload identifiers for replay protection, persist safe payload hashes, and reject older state transitions. Paid cycles create immutable transaction and statement records. Statements preserve line, tax-configuration, period, payment, and provider-reference snapshots but make no official tax-invoice or BIR-registration claim.

Receipt-photo deletion remains exact through `ReceiptFile.retentionUntil` and the scheduled retention executor. A version-controlled S3 lifecycle rule provides a 365-day prefix-bounded safety net. The lifecycle installer merges only TINDAHAN-owned rule IDs and preserves unrelated bucket rules. Structured receipts, inventory movements, confirmations, and audit history are never lifecycle-deleted.

## Consequences

- Production web runtimes fail fast unless Xendit and Resend configuration is complete; the receipt Lambda remains independent of web-only secrets.
- Plan activation, restriction, and cancellation are eventually consistent with authenticated webhooks.
- An inactive Xendit recurring plan is not treated as reactivatable; a returning owner begins a fresh approved checkout.
- Exact 90/180/365-day photo policy requires the scheduled retention executor. S3 lifecycle alone is only the 365-day backstop.
- Operator credentials that manage bucket lifecycle are separate from the application runtime identity.
