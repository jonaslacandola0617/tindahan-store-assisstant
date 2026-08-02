# Phase 2 implementation report

Date: July 31, 2026  
Status: Complete

## 1. Executive summary

Phase 2 delivers a PostgreSQL-backed product catalog, authoritative inventory balances, immutable movements, manufacturer and Tindahan barcode workflows, deterministic label output, and prototype-faithful list/grid inventory screens. The static prototype at `design/static-prototype/` remained unchanged and was used as the visual contract.

## 2. Scope delivered

Product creation/editing/archive, categories, suppliers, normalized selling units, starting stock, add stock, traceable adjustments, movement history, search, filters, cursor loading, persisted list/grid view, barcode assignment/generation/replacement, compact/standard/price labels, print, SVG download, English/Filipino copy, authorization, validation, concurrency, and idempotency.

## 3. Authority reconciliation

The PRD governed behavior, the static prototype governed composition and styling, Visual Identity v1 governed tokens and accessibility corrections, and Phase 1 ADRs governed architecture. Prototype-only instructional copy was replaced with truthful production copy without changing layout or visual identity. No unresolved authority conflict remains.

## 4. Database entities and migrations

The Phase 2 migration adds inventory view preference, product description, movement previous quantity, barcode actor/replacement history, and supporting indexes. Existing Product, Category, Supplier, InventoryBalance, InventoryMovement, ProductBarcode, BarcodeLabel, AuditEvent, and IdempotencyKey models are used. Development and isolated test-schema migrations were applied successfully.

## 5. Inventory transaction strategy

Product creation atomically creates the product, balance, optional opening movement, catalog references, barcode, audit event, and idempotency response. Stock writes atomically update the balance, append a movement, update cost when supplied, record audit data, and complete the idempotency key. A failure changes neither balance nor history.

## 6. Concurrency strategy

Stock writes use serializable transactions plus a conditional balance update against the current version. Serialization conflicts retry up to three times. Negative results are rejected before the write, and stale requests receive refresh-and-retry guidance.

## 7. Idempotency strategy

Create-product, add-stock, adjust-stock, assign-barcode, generate-barcode, and replace-barcode requests carry client-generated keys. Store, scope, key, request hash, completed response, and expiry are persisted. Reuse with different input returns a conflict.

## 8. Barcode-generation strategy

The server generates a valid internal EAN-13 value, checks store-scoped uniqueness, assigns it atomically, and never exposes its algorithm. Replacement retires the active internal code and links the new assignment to it. Labels derive SVG bars, name, readable value, optional price, and print timestamp context without storing binary files.

## 9. Product and unit rules

The approved stable units are implemented. Stock is always entered in the product's selling unit; there is no pack conversion. `OTHER` preserves the raw owner wording and flags the product for later canonicalization. Store-entered names are preserved while normalized values support lookup.

## 10. Screens implemented

- Inventory list and operational grid
- Add-product dialog with progressive barcode choices
- Product details and overview
- Add/adjust stock with result preview
- Product edit and archive confirmation
- Barcode assignment, generation, preview, print, download, reprint, and replacement
- Loading, empty, no-match, error, retry, status, and pagination states

## 11. Prototype components reused

Application shell, content header, chips, segmented toggle, comfortable row list, inventory cards, cards, badges, banners, fields, stepper, modal composition, toast, empty state, mobile navigation, and print rules come from the static prototype CSS.

## 12. New components and justification

Only production behavior wrappers and a code-native EAN-13 SVG renderer were added. The renderer is required for scannable print/download output and inherits prototype sizing and typography.

## 13. Visual identity preservation evidence

Production continues importing the prototype token, base, component, layout, page, and responsive styles. Browser inspection at 1440×900 and 390×844 confirmed the approved shell, typography, spacing, emerald/olive treatments, cards, navigation transitions, and no horizontal overflow. The immutable prototype was not edited.

A follow-up side-by-side parity audit covered the complete inventory and product-detail state matrix rather than only the default screen. It restored the prototype's exact inventory-card anatomy (header, status, copy, stock/price divider, and optional barcode footer), Add Product dialog scrim/title/subtitle/field rhythm/barcode choices/actions, product header spacing, barcode label dimensions, replacement-dialog subtitle, localized unit labels, and empty barcode action width. It also enabled the approved 240px-to-72px desktop sidebar collapse/expand behavior, placed every topbar control on one measured vertical center, and uses the product name in the product-detail topbar exactly as the matching prototype does. Category fields now offer a Warm Utility-aligned existing-category suggestion box with related matches, active-product counts, mouse and keyboard selection, and store isolation. Production-only metadata remains behind a visually compatible progressive disclosure so the core prototype structure stays dominant.

## 14. English and Filipino coverage

Inventory headings, filters, states, product form, stock workflows, barcode workflow, confirmations, and feedback have English and Filipino variants. Store-entered values and barcode values remain unchanged.

## 15. Accessibility work

Controls retain visible labels, semantic buttons/links, selected-state semantics, live status/error regions, 44px targets from prototype styles, keyboard-accessible forms, dialog labels, Escape handling on product creation, readable focus states, non-color status text, and a skip link. Responsive layouts avoid horizontal overflow.

## 16. Authorization and tenant isolation

All services resolve the store from the authenticated server session and membership. No route accepts a client store ID. Read operations require membership; product, stock, archive, and barcode writes require Owner. Cross-store access is covered by PostgreSQL integration tests.

## 17. Tests added

Domain tests cover unit normalization, product validation, stock math/status, barcode validation/check digits, and role policy. Eight PostgreSQL integration tests cover atomic creation/opening movement, duplicate add-stock submission, negative rollback, barcode history, role/store boundaries, store-isolated category suggestions, concurrent reconciliation, and archive preservation.

## 18. Commands executed

`pnpm db:generate`, `pnpm db:validate`, `pnpm db:migrate`, `pnpm db:migrate:test`, `pnpm db:seed`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and a signed-in browser walkthrough against the development server.

## 19–24. Verification results

- Lint: passed.
- Type-check: passed.
- Unit tests: passed.
- Integration tests: passed against the isolated PostgreSQL test schema.
- End-to-end browser walkthrough: passed for sign-in, product creation, persisted grid view, opening history, add stock, internal barcode generation, label preview, and navigation.
- Production build: passed with Next.js 16.2.12.
- Aggregate automated result: 9 test files and 27 tests passed.

## 25. Manual responsive verification

Verified at desktop 1280×720 and 1440×900, tablet breakpoints, and mobile 390×844. The audit covered list/grid, empty/no-match/loading feedback, Add Product base/barcode/manufacturer/advanced-detail states, add/adjust stock, edit/archive dialogs, barcode empty/generating/ready/template/replace states, movement history, collapsed navigation, English, Filipino, light, and dark modes. Mobile product details use the approved compact top bar and bottom navigation; long product titles truncate safely, paired fields stack, and stock previews remain readable. Measured document width did not exceed the viewport. A temporary real-database product was created for the state audit and archived afterward.

## 26. Known limitations

- Remote test latency is relatively high; the integration suite took about 56 seconds.
- PostgreSQL emitted a forward-compatibility warning for `sslmode=require`; deployments should use `sslmode=verify-full` when their provider supports it.
- The configured test database's pre-existing `public` schema was not reset. Tests safely use `tindahan_phase2_test` instead.
- Product images are not implemented because no production object-storage port is available in the current phase foundation; the approved restrained fallback is used.
- Camera/hardware scanning and unknown-barcode recovery are Phase 3 sale-entry work; Phase 2 supports deliberate manufacturer-code entry/assignment.

## 27. Deferred Phase 3+

Sales, receipt OCR/confirmation, dashboard projections, reports, notifications, global search, billing, staff management, camera scanning, and product-image storage remain deferred according to the delivery plan.

## 28. Exact manual verification steps

1. Set `.env`, run `pnpm install`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:migrate:test`, and `pnpm db:seed`.
2. Run `pnpm dev`, open `http://localhost:3000/sign-in`, and sign in with the local seed account documented in README.
3. Open Inventory, create a product with starting quantity, and confirm it appears in list and grid views.
4. Reload after choosing Grid and confirm the preference persists.
5. Search by partial name, category, supplier, and barcode; exercise All, Low Stock, Out of Stock, and Recently Updated.
6. Open Product Details and confirm the opening movement reads 0 to the starting quantity.
7. Add stock, then adjust stock for each reason; verify current/resulting quantities and append-only history.
8. Attempt a negative result and confirm the request is rejected without a new movement.
9. Edit metadata, reload, and confirm it persisted; archive and confirm the product leaves active results while its detail/history remains stored.
10. Assign a manufacturer barcode. Generate an internal barcode, switch label templates, print, download SVG, reprint, and replace it; confirm the old code is retired.
11. Repeat key flows in FIL, dark mode, desktop, tablet, and mobile widths.
12. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before release.
