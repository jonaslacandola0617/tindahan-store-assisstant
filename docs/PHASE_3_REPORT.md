# Phase 3 implementation report

Date: August 2, 2026  
Status: Complete; automated browser E2E and live visual-width checks unsupported in this environment and explicitly deferred to the documented manual review

## 1. Phase objective

Deliver the complete production Sales vertical slice without beginning Receipt Processing: fast product selection, scan-to-draft, safe confirmation, inventory deduction, immutable history, recovery, correction, synchronized dashboard fields, localization, responsive UI, and accessibility.

## 2. Phase 2 systems reused

Sales reuses server-resolved Store Membership, Product and Balance authority, catalog search conventions, the shared manufacturer/internal barcode records and validator, manufacturer-barcode assignment, Product creation rules, versioned Balance writes, immutable Inventory Movements, AuditEvent, IdempotencyKey, and the Warm Utility prototype CSS/components. The Phase 2 create-product transaction now retries serialization conflicts consistently with stock writes.

## 3. PRD requirements implemented

Active-product search; recent/frequent suggestions; manufacturer and Tindahan barcode resolution; camera, manual, focused, and rapid keyboard-style scanner input; explicit unknown recovery; positive whole quantities; stock conflicts; atomic confirmation; exact-once effects; history/details; immutable snapshots; full historical correction; authoritative dashboard sales fields; Owner/Staff recording; Owner-only correction; store isolation; English/Filipino; dark tokens; and recovery states are implemented. Payment processing and Phase 4 are not implemented.

## 4. Sales domain architecture

`src/modules/sales/domain` owns input and draft helpers. `application/sales-service.ts` owns context, policies, queries, confirmation, and correction. Route handlers expose business-intent operations. React components hold only effect-free draft state and call typed JSON endpoints; they do not import Prisma.

## 5. Database schema and migration changes

Migration `20260802_phase3_sales` adds `Sale.totalQuantity`, `Sale.correlationId`, `SaleLine.otherUnitSnapshot`, the `CORRECTED` status, a confirmed-time index, and `SaleCorrection` with Store, Sale, actor, reason, time, and correlation. Development and isolated `tindahan_phase3_test` migrations were applied.

## 6. Sale state model

Drafts remain client-side. The persisted lifecycle is `CONFIRMED → CORRECTED`; confirmed lines are terminal snapshots. This is the simplest PRD-compatible model and avoids server draft cleanup without weakening confirmation integrity.

## 7. Atomic transaction design

Confirmation resolves membership, parses and merges lines, reads all active store-owned Products/Balances, detects conflicts, conditionally decrements every versioned Balance, creates one Sale and its SaleLines, appends one SALE Movement per line, writes AuditEvent and IdempotencyKey, then commits. Any thrown conflict rolls back every effect.

## 8. Concurrency strategy

Serializable transactions retry up to three times. Every deduction also requires the expected Balance version and `quantity >= requested`. Two Sales competing for final stock therefore produce one success and one safe conflict rather than negative stock.

## 9. Idempotency strategy

`CONFIRM_SALE` and `CORRECT_SALE` keys are unique by Store/scope/key. A deterministic normalized payload hash rejects changed reuse. A completed retry returns the stored stable response. UI button disabling is only feedback, never the integrity boundary.

## 10. Barcode-scanner implementation

All sources use `/api/sales/barcode` and Phase 2 normalization. The camera requests the rear camera and uses the maintained ZXing browser decoder for cross-platform one-dimensional barcode recognition instead of depending on the experimental, platform-limited `BarcodeDetector` API. When camera permission is already granted, opening Scan barcode starts the live feed immediately; otherwise the prototype-aligned Use camera control remains available to initiate the permission flow. Successful reads keep the feed active and use the shared Warm Utility semantic success toast so consecutive customers' items can be scanned without extra clicks. A presence latch prevents one barcode held in frame from being added repeatedly and releases after it leaves the frame. The decoder loop and every media track stop on cancel, close, error, recovery-state exit, and unmount. Manual entry remains available. Focused scanner submission and guarded rapid page input support keyboard-style USB/Bluetooth devices without capturing ordinary form typing. A 900ms same-code cooldown reports ignored duplicate manual reads; deliberate later scans increment quantity.

## 11. Unknown-barcode recovery

Unknown lookup returns only `{found:false, code}`. Owner recovery either searches an active Product then calls the Phase 2 assignment operation, or creates the standard Product/Balance/opening Movement/barcode records atomically. Staff receive plain guidance to ask the Owner. No unknown scan creates, links, sells, or changes stock automatically.

## 12. Product search and suggestion strategy

Search is store-scoped, active-only, bounded to 20, debounced by 250ms, and matches indexed normalized names or active barcode values. No full catalog is downloaded. Recent uses distinct confirmed SaleLines; frequent uses a confirmed-quantity aggregate. Empty stores receive an honest instructional state.

## 13. Sales history implementation

History is Store-scoped, date-range filtered, ordered newest first, cursor-paginated by 20, and rendered with the prototype's calm expandable sale rows. Each row links to immutable details. Totals aggregate only currently confirmed Sales so corrected Sales do not inflate dashboard or range summaries.

## 14. Correction/void behavior

Phase 3 supports one full correction only. Owner supplies a reason; the operation restores each original line through new REVERSAL Movements, creates SaleCorrection, audits the actor/outcome, and marks the Sale CORRECTED. Original SaleLines never change. Partial returns, refunds, exchanges, and customer credit are deferred.

## 15. Dashboard synchronization

Today's total amount, units, count, low/out attention, and recent Sales now query authoritative records. Quick Record Sale routes to `/sales/new`. Fabricated Sales activity was removed. The five-section prototype hierarchy remains intact; broader insights remain Phase 5.

## 16. UI screens changed

Production `/sales`, `/sales/new`, `/sales/:saleId`, scanner/recovery/success/correction overlays, and Dashboard were implemented. The generic Sales placeholder is superseded without altering the immutable prototype.

## 17. Prototype components reused

App shell, back link, content header, grid, cards, input group, barcode-entry card, scanner surface, row list, sale-row accordion, steppers, banners, badges, segmented control, modal/scrim, empty state, success pattern, buttons, and responsive navigation are reused directly from prototype styles.

## 18. New components and justification

Only production state wrappers were added: history client, Record Sale client/scanner, and details/correction client. Small CSS selectors compose approved tokens and primitives; there is no new design system, color, radius, shadow, icon library, or POS layout.

## 19. Strict prototype-compliance evidence

Markup and selectors were audited against `record-sale.html`, `sales.html`, `barcode-workflows.js`, and the corresponding component/page/responsive CSS. Composition, copy style, one primary action, two-column-to-stack behavior, sticky summary, stock banner, success modal, and accordion anatomy are preserved. Live in-app browser regression could not be completed because the browser security policy blocked localhost; no pass is claimed for that check.

An August 2 follow-up audit used owner-supplied production screenshots side by side with the immutable prototype. It removed a production-only `border: 0` override from sale-picker rows, restored the prototype's bag icon and item-first hierarchy to every Sales-history row, and replaced the draft summary's wrapping flex row with a stable grid. The `This sale` card now keeps one predictable height, scrolls only its line region, and pins conflicts, totals, and Confirm sale inside the same card. Desktop lines reserve named areas for product information, price, removal, and quantity; mobile lines stack those areas without shrinking touch targets. Camera streams also stop whenever scanning leaves the active/requesting states. A scanner audit then confirmed that Windows Chrome could grant camera permission while lacking `BarcodeDetector`; the production scanner now decodes through ZXing and reports permission, unavailable-device, busy-device, unsupported-capture, and decoder-start failures separately. Dashboard attention reminders now preserve the prototype's direct-versus-grouped anatomy: a single affected product is named with stock and price context and links directly to Restock, while multiple affected products retain the count title and list representative product names.

## 20. Visual identity compliance

All UI inherits Plus Jakarta Sans, warm canvas/surfaces, emerald Sales actions, olive stock context, semantic warning/danger tokens, approved radii/shadows/motion, and dark-mode remapping from the immutable prototype imports. No arbitrary color or spacing values were introduced.

## 21. English and Filipino coverage

History, range controls, Record Sale, product/stock text, scanner states, unknown recovery, quantity/conflict feedback, confirmation, details, movement history, and correction have natural EN/FIL copy. Product names are unchanged. Locale refresh preserves client draft state.

## 22. Responsive verification

Source-level parity confirms prototype breakpoints, sidebar/bottom navigation, `dash-grid` stacking at 1180px, non-sticky mobile summary, 44px controls, stacked scanner fields, and compact sale lines. Live width checks at 1440/1280/1024/768/390 remain manual because localhost browser access was blocked.

## 23. Accessibility work

Semantic headings, labels, native buttons/inputs, product-specific stepper names, live scan/draft feedback, icon-plus-word states, modal focus trap/restoration, Escape close, camera fallback, reduced-motion inheritance, non-color conflicts, and 44px targets are present. Success and failure never rely on sound.

## 24. Authorization and Store isolation

Every operation resolves Store and role from the authenticated user. Owner and Staff record Sales. Barcode/product/history/detail queries validate Store ownership. Barcode linking, Product creation, and correction remain Owner-only. Cross-store barcode and history/detail tests pass.

## 25. Performance considerations

Search and barcode queries are bounded and indexed; history is paginated; suggestions are bounded; confirmation loads Products/Balances in one batch; details use one Sale graph plus one movement query; dashboard performs bounded aggregates. No search service, catalog download, or N+1 Balance loop is added.

## 26. Tests added

Domain tests cover positive quantities, line merge, scan cooldown, totals, policies, and user-facing camera failure classification. PostgreSQL integration covers known/unknown/cross-store barcode resolution, Staff confirmation, atomic effects, duplicate confirmation, changed idempotency payload, rollback, competing final stock, suggestions, history isolation, Owner-only correction, compensation reconciliation, snapshots, and archived Product rejection.

## 27. Commands executed

`pnpm db:generate`, `pnpm db:validate`, `pnpm db:migrate`, `pnpm db:migrate:test`, `pnpm lint`, `pnpm typecheck`, focused Vitest integration runs, `pnpm test`, `pnpm build`, and development-server startup.

## 28–34. Verification results

- Formatting: no standalone formatter script is configured; ESLint is the repository formatting/static-analysis gate.
- Lint: passed with zero errors and zero warnings.
- Type-check: passed in strict mode.
- Unit tests: passed.
- Integration tests: passed against the isolated PostgreSQL schema.
- Aggregate automated result: 13 test files and 49 tests passed.
- End-to-end: automated browser E2E is not configured; in-app localhost access was blocked by browser policy. Manual steps are below and no E2E pass is claimed.
- Production build: passed with Next.js 16.2.12; all Sales pages and operations were emitted as dynamic routes.

## 35. Known limitations

Camera recognition requires a secure context, browser media-capture support, and a readable one-dimensional barcode; manual/scanner entry is the safe fallback. The remote test database is slow and emits its existing future SSL-mode warning. There is no persisted interrupted draft, audible scan feedback, Product image storage, or automated visual-regression harness. Live visual width checks remain manual in this environment.

## 36. Deferred Phase 4+

Receipt upload/OCR/review/confirmation, private file storage, durable jobs, notifications, full Dashboard projections/insights, reports, global search, billing, staff management, partial returns/refunds/exchanges, customer records, tax, discounts, and payment processing remain deferred.

## 37. Exact manual verification steps

1. Run `pnpm db:migrate`, `pnpm db:migrate:test`, `pnpm db:seed`, and `pnpm dev`; sign in with the documented seed account.
2. Open `/sales/new`; verify empty/suggestion/search/loading/no-match states and that Confirm sale starts disabled.
3. Search and add a Product; add it again and verify quantity/total update. Type above stock; verify named requested/available feedback and disabled confirmation, then reduce/remove.
4. Enter `4800016640017`, `2800000000068`, and `8999999999999`; verify manufacturer/internal adds and explicit unknown recovery. Repeat a code inside and after the cooldown.
5. Open the camera overlay on a supported mobile browser; allow/deny permission, close it, and verify the camera indicator stops. Use manual fallback.
6. As Owner, link an unknown code and create a Product from another; as Staff, verify those controls are unavailable but sale recording works.
7. Confirm a Sale once, retry the same request, and verify one Sale, one deduction per line, success feedback, Dashboard totals/activity, history, and details.
8. Correct the Sale as Owner with a reason; verify original snapshots remain and restoring Movements appear. Verify Staff cannot correct.
9. Switch EN/FIL and light/dark while a draft exists; verify draft/search/quantities remain. Audit at 1440, 1280, 1024, 768, and 390px with no overflow.
10. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

## 38. Screens and workflows ready for review

Dashboard Sales synchronization, Sales history/ranges/pagination/accordion, Record Sale picker/search/suggestions, draft/stock conflict, focused/global scanner entry, camera/manual scanner, unknown link/create recovery, confirmation success/failure, immutable Sale Details, Inventory Movement trace, and Owner correction are ready for review. Phase 4 has not begun.
