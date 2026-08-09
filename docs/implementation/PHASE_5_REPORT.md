# Phase 5 implementation report — Receipt Review and Inventory Integration

Date: 2026-08-03

## 1. Scope delivered

Phase 5 turns the Phase 4 private-storage and extraction pipeline into an owner-safe approval workflow. Receipt extraction remains a proposal. Inventory changes only after an authenticated store member explicitly confirms a fully resolved review.

The implemented lifecycle is:

`UPLOADED → QUEUED → PROCESSING → REVIEW_READY → CONFIRMED`

Recovery terminal states are `FAILED`, `REJECTED`, and `REVERSED`. A review-ready receipt can be prepared again without changing stock.

## 2. Receipt review experience

- Private, short-lived original-image display with lazy loading.
- Secure original-image download; no presigned URL is persisted.
- Expandable raw detected text.
- Grouped recognized, new, uncertain, and excluded lines.
- Editable quantity and purchase cost with optimistic UI and rollback on failure.
- Store-scoped catalog selection, barcode scanning, product creation, and line exclusion.
- Production-grade confirmation, prepare-again, rejection, and duplicate-warning dialogs using Warm Utility tokens.
- English and Filipino owner-facing copy.

Provider names, queue terminology, raw confidence percentages, database identifiers, and worker logs remain internal as required by the PRD and repository UI contract. Uncertainty is communicated through actionable review groups and plain failure messages.

## 3. Product matching and remembered mappings

The matcher uses the following store-scoped order:

1. active barcode match;
2. prior owner-confirmed receipt alias;
3. normalized exact product name;
4. bounded fuzzy candidate ranking.

Every candidate keeps its source and internal score. OCR line confidence is now persisted in `ReceiptLine.internalConfidence`. A confirmed correction creates or refreshes a `ReceiptAlias`, allowing future receipts to reuse the owner’s mapping without leaking cross-store data.

## 4. Unknown-product workflow

Unmatched or uncertain lines can be linked to an existing active product, resolved by scanning a product barcode, converted into a new catalog product, or excluded. A receipt cannot be confirmed until every included line has a product and positive quantity.

## 5. Approval engine and inventory update

Confirmation runs in one serializable database transaction. It:

- locks the review outcome through receipt state and idempotency checks;
- validates every included line;
- creates one immutable `ReceiptConfirmation`;
- appends immutable `InventoryMovement` rows with previous, delta, and resulting quantities;
- updates the materialized inventory balances with version checks;
- persists final line snapshots and learned aliases;
- records an audit event; and
- marks the idempotency key complete.

No extraction, retry, edit, mapping, or rejection path writes an inventory movement.

## 6. Rejection and recovery

- Added the terminal `REJECTED` receipt state and immutable `ReceiptRejection` record.
- Rejection is idempotent and records actor, reason, time, correlation identifier, and an audit event.
- Review-ready and failed receipts can be prepared again using the existing durable job pipeline.
- Reprocessing keeps the current review visible until a replacement extraction completes successfully.
- Failed receipts retain plain recovery guidance and support secure original-image download.
- Confirmed receipts retain the existing owner-only compensating reversal flow.

## 7. Audit history

Receipt details now expose owner-safe uploader, upload time, preparation time, approver, approval time, rejection actor/reason/time, and immutable inventory history. Internally the receipt/extraction/movement records retain correlation identifiers, extraction provider/version, confidence metadata, and receipt-line references. Sensitive infrastructure details are available only through structured server logs, not the owner UI.

## 8. Dashboard indicators

The dashboard now provides store-scoped counts for:

- processing receipts;
- receipts needing product mapping;
- receipts awaiting approval; and
- receipts needing another try.

The existing prototype attention-card anatomy, typography, spacing, borders, and Warm Utility colors are preserved.

## 9. Performance and interaction behavior

- Receipt history remains cursor-paginated.
- Active processing states use bounded background refresh.
- Receipt images use native lazy loading.
- Review edits update optimistically and roll back if the server rejects the change.
- Server queries remain store-scoped and return only the fields required by the screen.

## 10. Database changes

Migration: `prisma/migrations/20260802_phase5_receipt_review_inventory/migration.sql`

- extends `ReceiptStatus` with `REJECTED`;
- adds `ReceiptLine.internalConfidence`;
- adds `ReceiptRejection` with store, actor, idempotency, reason, correlation, and timestamp constraints.

The migration was applied successfully to the configured development and isolated test schemas before final verification.

## 11. Security controls

- All receipt access is resolved from authenticated membership; no client store identifier authorizes access.
- Read/download URLs are short-lived and generated only after receipt ownership checks.
- Download filenames are sanitized and do not change the protected object key.
- Rejection, review edits, retry, and confirmation are store-scoped application services.
- Provider-native errors, object keys, secrets, and complete signed URLs are not rendered or logged to owners.
- Infrastructure providers and the Phase 4 worker/queue architecture were not replaced.

## 12. Tests added or extended

- receipt state transition coverage for rejection;
- idempotent rejection with zero inventory mutation and one audit event;
- OCR line-confidence persistence;
- prepare-again from review-ready with zero inventory mutation;
- private read token download-name sanitization;
- existing store-isolation, atomic confirmation, retry, duplicate-job, reversal, and reconciliation coverage retained.

## 13. Visual parity audit

The implementation was compared against `design/static-prototype/` and the Warm Utility component contracts. Review grouping, image card, progress treatment, line-card borders, controls, spacing, dialog hierarchy, button variants, focus behavior, desktop columns, and narrow-screen stacking remain aligned with the prototype while accommodating production-only recovery controls.

An authenticated live browser walkthrough was completed against the isolated test schema at the default desktop viewport and at 390 × 844. It covered dashboard receipt indicators, receipt upload, processing completion, original-image rendering, raw-text disclosure, recognized/new/excluded groups, quantity and purchase-cost inputs, disabled confirmation guidance, prepare-again/reject actions, the rejection dialog, responsive bottom navigation, and narrow-screen stacking. No spacing, overflow, focus, or visual-identity blocker remained after the final pass.

## 14. Verification results

Final command results are recorded honestly below:

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: passed — 104 tests passed and the opt-in cloud smoke test was skipped by default.
- `pnpm build`: passed — production compilation, type-checking, page-data collection, and 28 static-page generations completed.
- focused receipt storage/domain tests: passed — 9 tests.
- PostgreSQL receipt integration test: passed — 5 store-scoped receipt scenarios, including atomic confirmation, rejection, reprocessing, and zero pre-approval inventory mutation.
- authenticated desktop/mobile browser walkthrough: passed against the isolated test schema.

## 15. Cloud and combined-flow verification

The configured opt-in AWS S3/Azure smoke test was run successfully in the final pass: 1 test passed against the configured private S3 storage and Azure receipt extraction. Phase 5 did not replace or alter those providers. The automated receipt integration path verifies upload confirmation, durable processing, normalization, review persistence, explicit confirmation, immutable movements, idempotency, and zero pre-approval inventory mutation.

A new end-to-end live cloud approval was not performed during this pass because it would require a writable authenticated database/store context and would create real inventory records. Do not interpret the adapter smoke plus automated transaction test as a claim that a fresh live `S3 → Lambda → Azure → approval` run completed in this final pass.

## 16. Known limitations and deliberate decisions

- Arbitrary unit editing is not offered on a receipt line. The canonical unit belongs to the mapped catalog product; choosing or creating the correct product changes the unit safely.
- Raw confidence percentages are internal. The owner sees recognized/new/uncertain groups and the action required, per the PRD.
- Raw worker logs are not exposed in the application. Correlated structured logs remain server-side for authorized operational support.
- Broader reports, exports, and grouped notification history are Phase 6 operating-view work. Phase 5 includes only receipt-status dashboard indicators.

## 17. Manual verification steps

1. Apply migrations with `pnpm db:migrate` and `pnpm db:migrate:test`.
2. Start the app with `pnpm dev` and sign in to a writable development store.
3. Upload a JPEG, PNG, or WebP receipt smaller than 10 MB.
4. Confirm it moves through processing into the review list without changing inventory.
5. Open review; verify the private image, detected text, grouped lines, quantity, purchase cost, and matches.
6. Resolve uncertain lines by selecting, scanning, creating, or excluding.
7. Use **Prepare again** once and confirm stock is unchanged while processing restarts.
8. Confirm a different test receipt and verify every included quantity is added exactly once.
9. Refresh and repeat the same confirmation request; verify no duplicate movement appears.
10. Verify the receipt detail shows uploader, approver, timestamps, and linked inventory history.
11. Reject another review-ready receipt and verify no inventory movement is created.
12. Verify the dashboard receipt indicators and narrow-screen stacking.
