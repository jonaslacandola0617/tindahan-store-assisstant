# Phase 6 implementation report

Date: 2026-08-09

## Scope delivered

Phase 6 adds TINDAHAN's operating view without expanding into Phase 7 settings, staff, subscription, or billing behavior.

- Prototype-faithful Reports page with This week/This month ranges, top sellers, low-stock attention, movement explanation, inactive products, truthful empty states, and Filipino copy.
- UTF-8 CSV operational export generated from the same store-scoped report DTO used by the page.
- Progressive global search across active products, categories, suppliers, barcodes, and receipt history with bounded results, category shortcuts, loading/error/empty states, and store isolation.
- Durable grouped notifications for low stock and receipt-ready/failed work, unread badges, mark-one/mark-all behavior, history preservation, and direct next-action links.
- Existing action-first dashboard projections remain composed from authoritative inventory, confirmed-sale, and receipt services. Phase 6 does not turn the dashboard into a dense reporting page.

## Architecture and security

The operating-view presentation calls `src/modules/operating-view/application/operating-view-service.ts`; it does not import Prisma. Every operation resolves the authenticated user's active membership before querying, and every store-owned query includes the resolved Store ID. Search excludes archived products. Notification updates include Store and user visibility predicates. No route accepts a client Store ID.

Reports include only confirmed, uncorrected sales. Inventory flow comes from immutable `InventoryMovement` records, including receipt additions, manual additions, sales, corrections, opening stock, and reversals. Reporting, search, notification synchronization, read-state changes, and export never alter inventory balances.

Notification identifiers are stable server-generated hashes of the authorized Store and grouping key. Low-stock repetitions are grouped by Manila day; receipt state notifications are grouped by Receipt and state. No database migration was needed.

The export is a private, authenticated, no-store response. It contains operational rows only and is deliberately not described as an accounting or tax statement.

## Visual and interaction verification

The implementation was compared with:

- `design/static-prototype/reports.html`
- `design/static-prototype/search.html`
- `design/static-prototype/notifications.html`
- the shared Warm Utility tokens and component anatomy under `design/static-prototype/css/`

The running application was audited at `localhost` using a temporary local account and empty store. Reports, Search, Notifications, their loading and empty states, and top-header titles were inspected. One mismatch found during the audit—Search and Notifications inheriting the Dashboard top-header title—was corrected. No browser console errors were present on the audited pages. The temporary account and store were then deleted.

The in-app browser's viewport override did not change its reported desktop viewport, so responsive behavior was verified through the existing responsive stylesheet contracts and production CSS review rather than claimed as a live narrow-viewport screenshot.

## Tests added

- Manila week/month boundary unit tests.
- PostgreSQL report reconciliation for confirmed sales, movement totals, and low-stock projection.
- PostgreSQL store-isolation search test.
- PostgreSQL notification grouping, history, and mark-read test.

Database-backed tests remain opt-in through the configured test database. The migration helper now accepts `TEST_DIRECT_DATABASE_URL`; when a Neon test runtime URL uses the `-pooler` host and no direct URL is supplied, it preserves the same branch/database and resolves the matching direct host for Prisma schema operations.

## Commands executed

- `pnpm db:migrate:test`
- `pnpm lint`
- `pnpm typecheck`
- targeted Phase 6 `pnpm test` execution
- `pnpm test`
- `pnpm build`

Final results: lint passed, type-check passed, 118 tests passed with the explicitly opt-in live cloud smoke test skipped, and the Next.js production build passed with all Phase 6 routes included.

## Manual verification

1. Sign in to a store and open Reports.
2. Switch between This week and This month; verify sales and movement values reflect confirmed operations only.
3. Download the CSV and compare its rows with the visible report.
4. Open Search from the top bar; search by product name, category, supplier, and barcode, then verify a missing query gives a helpful empty state.
5. Create or lower a product to its reminder point and refresh; verify one grouped notification and the header badge appear.
6. Mark the notification read and verify its history remains.
7. Move to another Store account and confirm no first Store result, receipt, report value, or notification is visible.

## Known limitations and next phase

- PostgreSQL substring search is the approved V1 implementation; dedicated full-text infrastructure is unnecessary at current scale.
- Operational notification projection synchronization currently occurs during authenticated shell/notification reads; a future scheduler may materialize daily summaries without changing the contract.
- Phase 7 remains the next phase: SaaS readiness, configurable plan/trial state, staff invitations, owner-only settings and billing controls, retention controls, and pilot administration.
