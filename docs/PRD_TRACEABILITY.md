# PRD traceability matrix

Status values: `implemented` means present and verified in the production application; `foundation` means its trusted boundary or shared primitive exists; `planned` means deferred to the approved phase.

| Requirement | Phase | Owner | Status | Tests / evidence | Notes |
|---|---:|---|---|---|---|
| Secure registration, sign-in/out, sessions | 1 | Identity | implemented | auth/password unit tests; auth routes | Credentials are stored only as password hashes. |
| Store creation and Owner membership | 1 | Stores | implemented | tenancy policy tests; onboarding action | One active store in V1. |
| Owner and Staff server authorization | 1 | Stores | foundation | role and store-context tests | Feature-specific checks continue each phase. |
| English/Filipino persistence | 1 | Stores/UI | implemented | locale unit tests; preference route | Store-entered data is never translated. |
| Warm Utility shell, responsive navigation, dark tokens | 1 | UI | implemented | build and browser walkthrough | Static prototype remains visual baseline. |
| Environment validation, logging, errors, health | 1 | Platform | implemented | environment/logger tests; `/api/health` | External monitoring hook remains deployment-specific. |
| Product catalog, units, archive lifecycle | 2 | Catalog | implemented | catalog unit tests; PostgreSQL integration; browser walkthrough | Metadata is editable; products archive without deleting history. |
| Inventory balance and immutable movement ledger | 2 | Inventory | implemented | reconciliation, rollback, concurrency, idempotency integration tests | Serializable transactions plus versioned conditional balance writes. |
| Manual stock adjustment and history | 2 | Inventory | implemented | domain/integration tests; browser add-stock walkthrough | Previous, delta, result, reason, actor, and time are recorded. |
| Server-side catalog search/filter/cursor pagination | 2 | Catalog | implemented | store-isolation integration test; browser search/filter inspection | Results are bounded to 24 items and loaded by cursor. |
| Inventory list/grid preference | 2 | Catalog/UI | implemented | persisted-view browser walkthrough at desktop/mobile widths | Both views use the same query results. |
| Manufacturer/internal barcode lifecycle and labels | 2 | Barcodes | implemented | barcode unit/integration tests; browser generation/preview walkthrough | SVG labels are deterministic; replacement retires the prior code. |
| Draft and atomic confirmed sales | 3 | Sales/Inventory | implemented | sales domain and PostgreSQL integration tests | Serializable confirmation snapshots lines, conditionally deducts stock, appends movements/audit, and completes idempotency in one transaction. |
| Camera and hardware barcode sale input | 3 | Sales/Barcodes | implemented | scan cooldown unit tests; production scanner/manual fallback UI | Camera uses supported browser recognition; focused and rapid keyboard-style input share the store-scoped resolver. Scan changes draft only. |
| Unknown-barcode recovery | 3 | Sales/Barcodes | implemented | unknown/cross-store integration tests; explicit recovery UI | Unknown values do not mutate data; Owner may explicitly link or create, while Staff receive owner guidance. |
| Sales history, immutable details, and correction | 3 | Sales/Inventory | implemented | history/isolation/correction integration tests | Full Owner correction appends a SaleCorrection and restoring movements; original lines remain snapshots. |
| Receipt signed upload/private storage | 4 | Receipts/Platform | planned | isolation/file-abuse tests planned | No database blobs. |
| Durable receipt pipeline and OCR adapter/mock | 4 | Receipts/Platform | planned | retry/provider-contract tests planned | Provider details remain internal. |
| Receipt review and atomic idempotent confirmation | 4 | Receipts/Inventory | planned | transaction/idempotency E2E planned | AI proposes; owner confirms. |
| Receipt reversal with compensating movements | 4 | Receipts/Inventory | planned | reconciliation tests planned | Confirmed history is preserved. |
| Action-first dashboard and recent activity | 5 | Dashboard | foundation | Phase 3 authoritative sales summary/recent activity | Only the minimum Sales and stock fields required by Phase 3 are live; broader Phase 5 projections remain planned. |
| Reports and simple export | 5 | Reports | planned | reconciliation/export tests planned | Not accounting statements. |
| Notifications and grouping | 5 | Notifications | planned | grouping/history tests planned | Messages include next action. |
| Store-scoped global search | 5 | Search | planned | relevance/isolation tests planned | PostgreSQL search first. |
| Trial/paid plan and billing adapter | 6 | Billing | planned | state/authorization tests planned | Durations/pricing remain configurable. |
| Staff management and owner-only settings | 6 | Stores/Billing | planned | RBAC E2E planned | One adaptive app. |
| Security, accessibility, performance, backup/recovery audit | 7 | Platform/QA | planned | full hardening suite | Baselines begin in Phase 1. |
