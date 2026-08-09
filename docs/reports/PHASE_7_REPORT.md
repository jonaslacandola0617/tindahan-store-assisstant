# Phase 7 implementation report — SaaS readiness

Date: 2026-08-09  
Status: complete

## Delivered

1. Added a store-scoped subscription model with `PILOT`, `TRIAL`, and `STANDARD` plans and `TRIALING`, `ACTIVE`, `GRACE`, `RESTRICTED`, and `CANCELED` states.
2. Added a provider-neutral billing interface and an explicit manual pilot adapter. It does not imitate payment collection or expose a checkout that does not exist.
3. Added bounded server configuration for trial days, grace days, and invitation lifetime.
4. Backfilled all existing stores as active pilot stores so migration does not interrupt current users. New owner/store registrations create configurable trials.
5. Centralized writable-plan enforcement across Inventory, Sales, and owner-facing Receipt mutations. Grace remains writable; restricted/canceled stores retain reads and CSV export.
6. Added expiring Staff invitations with 256-bit random URL tokens and SHA-256 hashes at rest. Acceptance is one-time and transactionally creates the account/membership; revocation is owner-only.
7. Added a public invitation acceptance screen and safe sign-in callback for existing invited accounts.
8. Replaced the Settings placeholder with a production screen based on `design/static-prototype/settings.html`: store information, account details, password changes, language/theme, notifications, retention, team, and plan.
9. Enforced owner-only store, notification, retention, team, and plan controls on both UI and server. Staff retain self-service name, phone, language, theme, and password settings.
10. Added owner-configurable 1-, 3-, or 7-year receipt-photo retention for future uploads. Structured receipt, audit, confirmation, and inventory history is not deleted.
11. Added `pnpm pilot:store -- --email=<owner> --status=<state>` for audited operator-controlled pilot transitions.
12. Added account mobile-number persistence and audit records for settings, invitations, acceptance, and pilot transitions.

## Data migration

Migration: `prisma/migrations/20260809_phase7_saas_readiness/migration.sql`.

- Adds `StoreSubscription`, `StaffInvitation`, plan/status enums, `User.phone`, and `StorePreference.receiptRetentionDays`.
- Existing stores are inserted as `PILOT / ACTIVE`.
- Development and isolated test database migrations both completed successfully.
- No product, sale, receipt, user, store, or report-demo data was reset.

## Security and integrity controls

- Active Store and role always come from the authenticated server session and membership.
- Staff invitation emails and tokens cannot select a Store from client input.
- Invitation tokens are never persisted in plaintext and are returned only at creation time for owner sharing.
- Acceptance uses an atomic claim and serializable transaction, preventing replay from creating another membership.
- Owner-only mutations are checked in application services, not just hidden in presentation code.
- Plan restrictions do not remove access to records or export and do not modify inventory.
- Provider identifiers and billing internals are not shown in owner-facing copy.
- The manual adapter requires no payment secret and cannot charge a user.

## Visual and interaction audit

Compared the running implementation with `design/static-prototype/settings.html` and the Warm Utility component/tokens at the default desktop viewport and 390 × 844 mobile viewport.

Verified:

- prototype heading, subtitle, group/card anatomy, typography, borders, spacing, switches, segmented language control, and one dominant Save action;
- responsive mobile stacking, fixed mobile navigation, 44px controls, readable retention and notification rows;
- Settings save toast, invitation toast, invitation link, pending member row, and revoke cleanup;
- owner plan status and Staff-access grouping do not introduce library-default styling;
- no provider, queue, database, confidence, or internal-ID copy appears.

The browser audit found and fixed one async React form-reset error affecting successful invitation/password requests. A revoked invitation link is now also removed immediately from the screen.

The temporary visual-audit account, store, invitations, and audit rows were permanently removed after verification.

## Tests added

- subscription state/grace/write policy unit tests;
- environment default and bound tests;
- invitation hash, acceptance, replay, and revocation integration tests;
- Staff self-service versus owner-only preference integration test;
- restricted-store read/write policy integration test;
- owner registration now verifies trial creation.

## Commands and actual results

- `pnpm db:generate` — passed.
- `pnpm db:migrate` — passed; Phase 7 migration applied to development.
- `pnpm db:migrate:test` — passed; Phase 7 migration applied to isolated test schema.
- `pnpm lint` — passed.
- `pnpm typecheck` — passed.
- `pnpm test` — passed: 33 files, 125 tests; one opt-in live cloud smoke file/test skipped by design.
- `pnpm build` — passed; all 40 routes generated/analyzed successfully.
- Browser walkthrough — passed at desktop and 390 × 844 mobile after the documented form-reset correction.

The PostgreSQL driver emitted its existing forward-looking `sslmode` compatibility warning during database-backed checks; it did not fail a command. Explicit live payment-provider checks were not performed because no payment provider was configured or approved. Existing receipt AWS/Azure infrastructure was not changed.

## Manual verification

1. Sign in as an Owner and open `/settings`.
2. Update a harmless account/store value, save, and confirm the Warm Utility success toast.
3. Create a Staff invitation and copy the private link.
4. Open the link signed out, create the Staff account, and confirm it lands in the invited store.
5. Sign in as Staff and verify store, notification, retention, team, and plan controls are absent while account preferences remain editable.
6. As Owner, create another invitation and revoke it; the link and pending row should disappear and the link should no longer accept.
7. Change receipt-photo retention and start a new receipt upload; verify the new `ReceiptFile.retentionUntil` reflects the selected policy.
8. In a non-production test store only, run `pnpm pilot:store -- --email=<owner> --status=RESTRICTED`; verify reports/export still open and a business write returns the plain read-only message. Restore it with `--status=ACTIVE`.

## Known boundaries

- Payment checkout, invoicing, taxes, and pricing are deliberately not implemented without an approved provider and commercial policy.
- Invitation delivery is owner-shared by private link; email delivery needs an approved transactional email provider.
- Retention currently assigns durable lifecycle metadata to new files. Physical S3 lifecycle execution must be configured/implemented through the approved private-storage infrastructure and must not delete structured business history.
- Phase 8 remains responsible for release-wide security, accessibility, performance, backup/recovery, deployment, and monitoring hardening.
