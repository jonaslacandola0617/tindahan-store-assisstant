# Billing and transactional email operations

## Xendit contract

Production uses a server-only Xendit adapter. For a new store owner, Tindahan first creates/reuses the Xendit customer and then starts a hosted Payment Session with `session_type=SUBSCRIPTION` and `mode=PAYMENT_LINK`. The owner is redirected to Xendit's hosted page to authorize a supported recurring payment method. Tindahan does not create a paid entitlement from the browser return or from `payment_session.completed`; it waits for authenticated recurring-plan/cycle webhooks.

Direct recurring-plan creation is reserved for a future flow where Tindahan already has a reusable Xendit payment token. New-customer checkout must not assume a payment token exists.

Configure `BILLING_PROVIDER=xendit`, `APP_URL`, `BILLING_STANDARD_MONTHLY_AMOUNT_PHP`, `XENDIT_SECRET_KEY`, and `XENDIT_WEBHOOK_TOKEN`. `BILLING_STANDARD_MONTHLY_AMOUNT_PHP` is expressed in whole Philippine pesos: for example, `499` means PHP 499.00 per month, not 499 centavos.

The canonical Xendit webhook endpoint is:

```text
POST <APP_URL>/api/billing/webhooks/xendit
```

For the current Vercel deployment this resolves to:

```text
https://tindahan-store-assisstant.vercel.app/api/billing/webhooks/xendit
```

Do not configure `/api/webooks/xendit` (misspelled) or `/api/webhooks/xendit`; neither is the application billing route.

Register the canonical endpoint for the Xendit Recurring webhook. Payment Session, Payment Request V3, and Payment Token V3 callbacks may also point to the same authenticated endpoint while testing. Payment-session/token/request events are audit signals and do not grant paid access. The application changes subscription entitlement only for `recurring.plan.activated`, `recurring.plan.inactivated`, `recurring.cycle.retrying`, `recurring.cycle.succeeded`, and `recurring.cycle.failed`.

The hosted checkout stores the Payment Session ID temporarily in `externalSubscriptionId`. Xendit's recurring-plan activation webhook carries the checkout reference; Tindahan resolves that reference back to the internal subscription and replaces the temporary session ID with the authoritative recurring plan ID. Later cycle events resolve by that recurring plan ID.

Use Xendit test credentials until launch approval. Verify that the chosen Philippine payment channel supports merchant-initiated recurring transactions in the merchant Dashboard; API currency support alone does not guarantee a channel is enabled. Never put Xendit credentials in `NEXT_PUBLIC_` variables or logs.

Webhook processing:

1. Compares `x-callback-token` in constant time.
2. Reads `webhook-id`, or derives a deterministic fallback ID.
3. Persists a payload hash and safe event metadata.
4. Returns success for a previously processed event.
5. Resolves the subscription by recurring-plan ID, compact checkout reference, or temporary Payment Session ID.
6. Reconciles the temporary hosted-session identifier to the real recurring-plan identifier on activation.
7. Ignores browser/session/token events as entitlement proof and ignores older state events.
8. Applies recurring lifecycle state and immutable payment/statement records transactionally.
9. Sends a separately idempotent owner notification.

Xendit retries non-2xx deliveries, so alerts should cover webhooks left `RECEIVED` for 15 minutes and records marked `FAILED`. Do not replay events by editing the database. Redeliver the original provider event after the underlying incident is fixed.

Provider failures are logged without credentials or request bodies. The safe diagnostic includes the provider operation, HTTP status, and Xendit `error_code` when one is returned. This is enough to distinguish authentication, validation, rate-limit, and service failures without exposing payment/customer data.

## Pricing and tax readiness

The repository intentionally contains no locked commercial price. `BILLING_STANDARD_MONTHLY_AMOUNT_PHP` supplies the approved tax-exclusive monthly amount. For test-mode verification, `499` is a useful fixture because the automated billing tests already exercise PHP 499 cycle events; it is not a final pricing decision.

If tax treatment has been legally approved, set `BILLING_TAX_ENABLED=true`, a basis-point rate such as `1200`, and an owner-facing label. Otherwise keep tax disabled.

Statements are subscription payment records suitable for viewing, printing, or saving. They explicitly do not claim to be official tax invoices. Before making a tax-invoice claim, obtain legal/accounting approval and add the required registered seller identity and numbering controls.

## Resend contract

Configure `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME`. The sender domain must be verified in Resend with SPF and DKIM records. Use the exact production application URL in `APP_URL` so invitation buttons cannot point to a development host.

Every send has a persisted idempotency key and delivery state. Invitation delivery failure does not expose a secret in logs and does not destroy the invitation: Settings shows the failure and lets the owner copy the newly created private link. Resending revokes the previous token and creates one new active token.

## Provider verification

Normal automated tests use mock providers and create no external charges or email. Before launch, use a dedicated test store and Xendit test mode to verify hosted subscription checkout, payment-session completion without premature entitlement, recurring-plan activation, duplicate/out-of-order webhook delivery, cycle success, retry/failure, cancellation, and a fresh checkout after cancellation. Use a permitted test recipient to verify Resend sender-domain delivery. Record provider event/message IDs in the private release log; do not paste secrets or complete invitation URLs.
