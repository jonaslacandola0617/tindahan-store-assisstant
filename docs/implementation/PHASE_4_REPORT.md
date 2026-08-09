# TINDAHAN Phase 4 Implementation Report

## 1. Phase objective

Phase 4 turns the approved receipt prototype into a production-backed Scan → Review → Done workflow. Receipt processing assists the owner, while only explicit confirmation changes inventory.

## 2. Phase 1–3 systems reused

The implementation reuses authenticated store context and memberships, product creation/search, barcode scanning, the inventory balance and immutable movement ledger, audit events, idempotency records, the application shell, language preference, Warm Utility components, and the standardized loading system.

## 3. PRD requirements implemented

Implemented receipt capture/upload, private storage targets, durable processing, replaceable extraction, normalization, matching, review persistence, product resolution/creation, confirmation, history/details, recovery, duplicate warning, reversal, localization, responsive UI, accessibility, and cross-module synchronization. Phase 5 analytics and notifications remain out of scope.

## 4. Receipt domain architecture

Receipt presentation is under `src/app/(app)/receipts`; authenticated API routes delegate to `src/modules/receipts/application`; domain rules live in `domain`; extraction adapters live in `infrastructure`; storage and database adapters remain platform concerns. Presentation code does not import Prisma or provider SDKs.

## 5. Schema and migration changes

Migration `20260802_phase4_receipt_intelligence` adds receipt, file, extraction, line, match, confirmation, alias, reversal, and durable job records; receipt links on movements; statuses/enums; store ownership; uniqueness constraints; and store/status/time indexes. Development and test PostgreSQL migrations were applied successfully.

## 6. Receipt state model

The server validates `UPLOADED → QUEUED → PROCESSING → REVIEW_READY → CONFIRMED`, failure/retry to `QUEUED`, and owner reversal to `REVERSED`. Invalid, duplicate, or stale transitions return stable domain errors and never rely on hidden controls.

## 7. Upload strategy

An authenticated user initializes a receipt with validated metadata and an idempotency key, receives a short-lived PUT target, uploads directly, then completes the upload. Completion validates the stored bytes, MIME signature, size, dimensions, checksum, ownership, and state before queuing work.

## 8. Private storage strategy

Object keys are server-generated as `receipts/{store}/{year}/{month}/{receipt}/{file}.{ext}`; legacy keys remain readable. Development uses a signed local adapter; production uses the configured private AWS S3 bucket through one AWS SDK v3 client and short-lived signed PUT/GET URLs. A blank endpoint selects standard AWS regional resolution. URLs and image contents are not logged or persisted as public links.

## 9. Job architecture

`JobRun` is the durable database job contract. The worker claims eligible work, records attempts and correlation IDs, validates stale states, executes idempotently, and records completion or a recoverable failure. A protected wake endpoint and polling worker script support deployment without running extraction in the upload request.

## 10. OCR provider adapter

`ReceiptExtractionProvider` returns one normalized provider-independent result. The infrastructure layer supplies deterministic mock, compatibility HTTP, and production Azure Document Intelligence adapters. Azure uses API `2024-11-30` with `prebuilt-receipt`, server-side bytes, protected asynchronous polling, normalized field mapping, bounded timeouts, and stable private error categories. Provider choice is environment-controlled and never owner-visible.

## 11. Mock-provider behavior

The deterministic provider produces a stable Home Table Foods receipt with prepared, uncertain, unmatched, and non-stock lines. Fixture naming can trigger unreadable, failure, or uncertainty paths without paid calls.

## 12. Normalization strategy

Normalization preserves raw source text while separately normalizing whitespace, common OCR punctuation, peso/decimal values, quantity tokens, and product names for matching. Missing values remain missing. Delivery, shipping, service fees, totals, and similar non-stock lines are excluded by deterministic rules.

## 13. Product-matching strategy

Candidates are batched and store-scoped. Ranking prefers confirmed store aliases, barcode, exact normalized active-product names, then restrained fuzzy similarity. Scores remain internal; ambiguous and unmatched results require review.

## 14. Alias-learning behavior

Confirmation upserts a store-specific normalized receipt-text alias to the selected active product. Aliases are learned only from owner/staff-confirmed outcomes and cannot cross store boundaries.

## 15. Review persistence

Every line correction, product selection, quantity change, exclusion, and restoration is saved server-side while the receipt is `REVIEW_READY`. Raw extraction is immutable and final corrected values are stored separately, so navigation or language changes do not lose work.

## 16. Product-creation reuse

The condensed receipt dialog delegates to the Phase 2 `createProduct` application service, prefilling recognized name and purchase cost and requesting only essential catalog fields. The new product is then linked to the receipt line without changing stock.

## 17. Atomic confirmation design

Confirmation executes in a serializable PostgreSQL transaction. It revalidates receipt state, duplicate acknowledgement, every included line, active products, quantities, balances, and the idempotency payload before creating confirmation, movements, aliases, audit data, and the final receipt state.

## 18. Inventory integration

Only the existing inventory balance and immutable movement model changes stock. Each included line creates a `RECEIPT` movement with previous/resulting quantities and traceable receipt, line, confirmation, actor, store, and correlation links. Excluded lines produce no effect.

## 19. Idempotency strategy

Upload, confirmation, product creation, and reversal use scoped idempotency keys and request hashes. Exact replays return the stored response; a reused key with another payload is rejected. Receipt uniqueness and confirmation relations provide additional database enforcement.

## 20. Retry strategy

Retry reuses the same receipt, file, extraction, and durable job identity, clears safe failure metadata, and never creates stock effects. Azure timeout, rate-limit, and availability failures automatically re-queue with bounded exponential backoff while attempts remain; permanent failures remain inspectable and manually retryable. Serializable write conflicts use bounded retries; tests execute remote-database integration files serially to avoid artificial cross-suite teardown deadlocks.

## 21. Duplicate-warning strategy

Phase 4 uses exact SHA-256 image checksum comparison within the same store. This is intentionally a warning, not a block: the owner compares the receipt and explicitly acknowledges before confirming. Similar-but-not-identical image detection is deferred.

## 22. Reversal strategy

Owner-only reversal runs atomically, checks available stock aggregated per product, appends compensating `REVERSAL` movements, preserves original receipt/lines/movements, records reason/actor/time/audit, and prevents replay. A named-product conflict is returned if later activity makes the reversal unsafe.

## 23. Security and privacy controls

Controls include authenticated server-resolved store context, store filters on receipts/files/products/aliases, owner-only reversal, signed short-lived object access, server-generated keys, MIME/byte/dimension/size validation, 20-upload-per-minute process limiter, production configuration checks, correlation IDs, and privacy-safe logs. A shared gateway limiter is still required for horizontally scaled production.

## 24. Dashboard and cross-module synchronization

The receipt navigation badge and attention area use real ready/failed receipt counts. A single receipt names the receipt/supplier; multiple receipts use the prototype aggregate pattern. Confirmed receipts join sales in recent activity, while inventory/search read updated production data directly.

## 25. Screens implemented

Implemented `/receipts`, `/receipts/new`, `/receipts/[receiptId]/review`, and `/receipts/[receiptId]`, including capture, real upload progress, durable processing, failure/retry, grouped review, matcher, barcode scanner, condensed product creation, duplicate warning, confirmation success, details, and reversal confirmation.

## 26. Prototype components reused

The screens reuse the prototype shell, content headers, receipt amber accents, paper cards, row lists, badges, banners, drop zone, split receipt review, modals, button hierarchy, empty states, and responsive navigation. `design/static-prototype/` remained unchanged.

## 27. New components and justification

Receipt-specific clients compose existing primitives. `useDialogFocus` centralizes focus trap/restoration and Escape behavior. Private receipt preview uses an ordinary image element because expiring signed/blob URLs cannot safely pass through public image optimization.

## 28. Strict prototype-compliance evidence

Production list, capture, review, matcher, dashboard attention, and details states were compared with the matching static prototype and token documentation. A live 1280px Filipino walkthrough confirmed the approved hierarchy, card anatomy, spacing, button dominance, and no horizontal overflow. Production-only copy replaces prototype/demo wording without changing visual identity.

## 29. Visual identity compliance

All Phase 4 styles use existing Warm Utility variables: off-white canvas, white paper surfaces, receipt amber identity, emerald confirmation, restrained warning/error colors, Plus Jakarta Sans, approved radii, shadows, spacing, focus rings, dark mode, and reduced motion.

## 30. Loading-system compliance

Route-level loading retains the animated TINDAHAN stroke reveal. Receipt routes and buttons use the standardized spinning icon with localized loading, uploading, saving, confirming, retrying, and reversing messages. Durable processing remains a persisted business state rather than a temporary spinner.

## 31. English and Filipino coverage

Navigation, capture, quality guidance, statuses, grouped review, actions, validation/recovery, confirmation, history/details, reversal, loaders, labels, and accessible names have natural EN/FIL copy. Store/product/supplier names and raw receipt text remain untranslated. Language switching does not restart processing.

## 32. Responsive verification

Prototype/CSS audits cover the required 1440, 1280, 1024, 768, and 390px contracts. Live browser verification was performed at the available 1280px viewport, including a no-horizontal-overflow DOM check on review. Mobile rules stack image/review content, preserve bottom navigation and 44px controls, and keep confirmation reachable; additional physical-device camera QA remains recommended.

## 33. Accessibility work

Work includes semantic headings/regions, labelled file and camera controls, keyboard actions, visible focus, dialog roles and labels, focus trap/restoration, Escape/backdrop close where safe, non-color status icons/text, `aria-busy`, restrained live updates, alternative receipt-image descriptions, touch targets, and reduced-motion behavior.

## 34. Observability

Structured privacy-safe events cover upload initialization/completion, job queue/start, provider completion/failure, normalization, matching, review ready, retry, duplicate warning, confirmation, idempotent replay, and reversal. Events carry store/receipt/correlation identifiers and counts, not receipt contents or signed URLs.

## 35. Performance considerations

The design uses direct uploads, asynchronous durable jobs, indexed pagination/status lookups, batched candidate fetching, bounded polling backoff, short signed URLs, and no matching N+1. Original files are preserved; thumbnail generation and event push are deferred until usage justifies them.

## 36. Tests added

Added domain tests for states, validation, parsing, non-stock classification, matching/ranking, review validation, provider and storage behavior, permission policy, plus PostgreSQL integration coverage for store isolation, confirmation/idempotency, balance/movement reconciliation, owner reversal/compensation, direct private upload, durable processing, matching, and non-stock exclusion.

## 37. Commands executed

For the infrastructure integration, installed AWS SDK v3 dependencies, ran the focused adapter tests, `pnpm db:migrate:test`, the complete `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and the explicitly enabled configured-provider smoke test. The Lambda work additionally ran its focused event/handler/environment tests, the PostgreSQL receipt integration suite, and `pnpm lambda:receipt:build`. Earlier Phase 4 work also ran fixture generation and the live browser walkthrough.

## 38. Formatting result

No repository formatting script is configured. Formatting was checked through ESLint and `git diff --check`; both completed successfully.

## 39. Lint result

`pnpm lint` passed with no lint errors.

## 40. Type-check result

`pnpm typecheck` passed with no TypeScript errors.

## 41. Unit-test result

All receipt unit/provider/storage/environment/retry/policy/Lambda-event/upload-presentation tests passed as part of the complete 100-test normal run. The one paid-provider smoke test is present but skipped by default.

## 42. Integration-test result

All inventory, sales, and receipt PostgreSQL integration tests passed against the configured isolated test database. The final normal result was 25 test files and 100 tests passed, with the separate opt-in cloud smoke file skipped. Receipt processing also passed explicit concurrent-claim and stale-claim recovery assertions without creating inventory movements.

## 43. End-to-end result

A live authenticated browser walkthrough passed for list → upload with real progress → leave/return-safe processing → review → exclude line → search/match product → persistent dashboard attention in Filipino. Automated integration tests cover confirmation exactly once and owner reversal. A dedicated automated browser E2E harness is not yet configured, so the full 30-case matrix is not claimed as automated.

## 44. Production-build result

`pnpm build` passed with the configured AWS S3 and Azure environment schema. Production runtime fails closed for local storage, mock/non-Azure OCR, incomplete AWS/Azure values, non-HTTPS Azure endpoints, and unsupported Azure API versions.

## 45. Known limitations

Production deployments must supply the existing private AWS S3 configuration, Azure Document Intelligence configuration, an external worker/wake schedule, exact-origin bucket CORS, and a distributed rate limiter. Duplicate detection is exact-image only. Physical mobile camera/device coverage and a dedicated browser regression suite remain deployment QA items. The configured Neon URL emits an upstream warning recommending explicit `sslmode=verify-full`.

## 46. Deferred Phase 5+ requirements

Deferred: full dashboard/report projections, notifications, provider settings, accounting workflows, supplier management, forecasting, offline sync, multi-store sharing, billing, advanced duplicate similarity, and broader operational analytics.

## 47. Exact manual verification steps

1. Configure `.env`, run `pnpm db:migrate`, `pnpm db:seed`, then start `pnpm dev` and `pnpm receipt:worker` in separate terminals.
2. Sign in and open **Receipts → Scan receipt**.
3. Take or upload a fixture; verify real upload progress and persistent **Processing receipt** state.
4. Return to Receipts, open the ready item, and verify the private original image and grouped lines.
5. Correct a quantity; search/scan/select a product; create one product; exclude and restore a fee line; refresh and verify persistence.
6. Switch EN/FIL and light/dark mode; verify state remains and layouts remain readable.
7. Confirm once; verify detail history and one immutable receipt movement per included line, then repeat the same request only through automated idempotency coverage.
8. As Owner, reverse with a reason and verify compensating movements; use a receipt whose stock was sold to verify the conflict path.

## 48. Receipt fixtures and demo steps ready for review

Run `pnpm receipts:fixtures` to regenerate deterministic images in `docs/fixtures/receipts`: normal, uncertain, unreadable, and provider-failure cases. Local development defaults to the deterministic mock; filenames select recovery scenarios documented in `docs/receipts/README.md`. A live unconfirmed review-ready Home Table Foods receipt was left in the development store for immediate UI review.

## 49. AWS S3 and Azure infrastructure integration addendum

1. **AWS adapter:** `AwsS3ReceiptStorageProvider` implements the provider-neutral storage contract with the official AWS SDK v3. One cached server-only `S3Client` supplies Put/Get/Head/Delete operations; an endpoint is configured only when non-blank and path style defaults off.
2. **Azure adapter:** `AzureDocumentIntelligenceReceiptProvider` uses the existing HTTPS resource, `prebuilt-receipt`, and API `2024-11-30`. Azure-native response types remain inside Infrastructure.
3. **Environment schema:** AWS and Azure requirements are conditional. Blank optional values normalize to missing, TTLs are bounded, generic Azure names and established provider-specific aliases normalize centrally, and production rejects local/mock providers.
4. **Presigned upload:** authenticated store context creates Receipt/ReceiptFile metadata and a protected key; the browser receives a short-lived content-type-bound PUT target; confirmation verifies stored bytes before the durable job is created.
5. **Signed read:** authorization and receipt ownership are checked before a short-lived GET URL is created. Only the object key is persisted, so an expired URL is recovered by reading the receipt again.
6. **Key strategy:** new keys use `receipts/{storeId}/{year}/{month}/{receiptId}/{fileId}.{validatedExtension}`. Unsafe characters, traversal, leading slash, unsupported structures, and expected-store mismatches are rejected. Original names remain metadata only.
7. **CORS:** the exact local and deployed origins require PUT/GET/HEAD plus `content-type`; the documented policy does not make objects public. Actual bucket CORS remains an external configuration check because the application IAM identity does not administer buckets.
8. **IAM:** runtime code needs object Put/Get/Delete; Head uses object-read authorization. It does not create/delete/list buckets, change ACLs, administer IAM, or access unrelated buckets. `ListBucket` is not used by the adapter.
9. **Azure mapping:** MerchantName, TransactionDate, Subtotal, TotalTax/Tax, Total, and Items with Description/Name, Quantity, Price, and TotalPrice map into normalized candidates. Raw recognized text is preserved and missing fields remain null.
10. **Error mapping:** authentication, invalid endpoint, quota, rate limit, unavailable, timeout, unsupported image, malformed response, cancellation, and unknown failures use stable internal categories. Provider payloads, endpoints, keys, object paths, and stack traces are not owner-facing.
11. **Retry/idempotency:** duplicate initialization and completion reuse existing records; only queued jobs can be claimed; transient Azure failures re-queue with bounded backoff; extraction lines are replaced for the same receipt; confirmation and inventory movements remain exactly-once.
12. **Security:** credentials stay in server-only environment parsing; objects remain private; signed URLs are short-lived and never logged/persisted; client keys are never trusted; all access uses server-resolved membership; OCR cannot mutate inventory.
13. **Tests added:** conditional environment/alias/TTL tests, key generation and unsafe-key rejection, Azure mapping/missing-field tests, asynchronous request/poll tests, safe provider-error classification, and bounded transient retry policy. The normal suite forces local/mock adapters and never calls paid services.
14. **Commands:** AWS packages were installed with pnpm; focused type/tests and the full mandated quality commands are recorded below after their actual execution.
15. **Live checks:** the explicitly enabled `pnpm receipts:cloud-smoke` passed against the configured development resources. It initialized the S3 client, uploaded the generated non-sensitive PNG through a signed PUT, confirmed object metadata/read, confirmed anonymous public access failed, confirmed signed GET succeeded, confirmed a one-second GET expired, completed Azure `prebuilt-receipt` analysis, and deleted/verified removal of the temporary object. It did not invoke inventory code. Bucket CORS was not read or changed because the least-privilege runtime identity does not require bucket-administration permissions.
16. **Known provider limits:** Azure receipt quality and regional quotas vary; signed URLs expire by design; CORS/IAM/public-access configuration lives outside the repository; browser CORS and expired-URL behavior require deployed-origin checks.
17. **Manual verification:** configure existing server-only values, apply exact bucket CORS, start app and worker, upload a valid image, confirm processing reaches review without stock changes, refresh the private image URL, review/confirm once, and verify one movement per included line. Run the opt-in cloud smoke only with a permitted synthetic receipt and expected provider billing.

## 50. AWS Lambda production execution target

The existing receipt processor now has two thin execution targets: the local polling loop and `src/lambda/receipt-worker.ts`. Both delegate to the same `processReceiptJob` application service. The Lambda bundle targets the available Node.js 22.x `x86_64` runtime. It accepts multi-record S3 `ObjectCreated` events, safely decodes keys, checks the configured bucket and `receipts/` prefix, validates the server-generated key against the `ReceiptFile` store, resolves the durable job, and relies on the existing atomic queued-job claim.

Lambda runtime detection allows AWS SDK default-role credentials while preserving the complete explicit credential-pair requirement outside Lambda. The pooled Neon connection uses the existing global Prisma singleton and remains open for warm invocation reuse. Atomic claims have a five-minute stale lease so an invocation timeout cannot strand work indefinitely, while fresh claims remain exclusive. Completed, running, failed, deferred, missing-file, malformed, wrong-bucket/prefix, and cross-store cases have deterministic behavior; retryable batch failures do not expose provider details.

`pnpm lambda:receipt:build` bundles the Node.js target and Prisma/runtime dependencies and writes a root-handler ZIP to `dist/lambda/tindahan-receipt-worker.zip`; the actual handler is `index.handler`. The current corrected ZIP contains only root-level `index.mjs`, is 2,387,660 bytes, and has SHA-256 `A14537846653CC7B9A50024AE5518BFDC2AEC26A09AC21D5CE6870DE14D2482E`. Its uncompressed bundle exceeds the Lambda console editor's 3 MB per-file viewing limit, so manual testing uses Lambda invocation and CloudWatch rather than console source editing. Deterministic tests cover encoded and malformed keys, wrong bucket/prefix, missing file/job, multiple and duplicate records, completed/running/failed/deferred jobs, atomic delegation, safe success/failure outcomes, cross-store safety, and no inventory movement during extraction. A Lambda-only callback/dependency collision was corrected by exporting a two-argument production wrapper whose test dependencies live in a closure; the temporary bucket and object-key diagnostics were removed after the mismatch was conclusively identified. The example event and deployment/rollback procedure are in `docs/receipts/README.md`.

No Lambda function, role, permission, notification, or S3 trigger was created or changed. The deployment ZIP is ready for manual upload to the existing function; trigger configuration remains intentionally deferred until its manual test passes.

## 51. Browser receipt-upload audit

The supplied `test-receipt.jpg` was verified as a valid 27,981-byte JFIF JPEG at 387×516 pixels. A live opt-in smoke run uploaded that exact image through a presigned PUT to the configured private bucket, read it back through authorized storage, completed Azure receipt extraction, and deleted the temporary object successfully. Browser-equivalent preflight checks initially returned HTTP 403 for both local origins and identified the missing CORS configuration. After the bucket configuration was corrected, both origins returned HTTP 200 with the expected allow headers; the tightened smoke then passed an actual signed PUT carrying `Origin: http://localhost:3000` and verified the response's matching CORS header before completing private read, Azure extraction, and cleanup.

The upload UI no longer maps an empty XHR/network failure to the file-format message. Rejected, unreachable, and timed-out secure uploads now receive distinct production-safe EN/FIL guidance, while actual MIME/size validation retains the JPEG/PNG/WebP message. Privacy-safe browser diagnostics record only failure category, HTTP status, page origin, target origin, and online state—never the signed URL or object key. The opt-in cloud smoke supports `RECEIPT_CLOUD_SMOKE_FILE` for an exact permitted image and `RECEIPT_CORS_ORIGIN` for browser-preflight and actual-response CORS assertions. The least-privilege application identity correctly cannot administer bucket CORS.
