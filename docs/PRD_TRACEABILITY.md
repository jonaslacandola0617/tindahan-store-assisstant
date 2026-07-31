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
| Product catalog, units, archive lifecycle | 2 | Catalog | planned | unit/integration/E2E planned | No hard delete with history. |
| Inventory balance and immutable movement ledger | 2 | Inventory | planned | reconciliation/concurrency tests planned | Schema and architecture defined in Phase 1. |
| Manual stock adjustment and history | 2 | Inventory | planned | transaction/E2E planned | Must show previous/change/result/reason. |
| Server-side catalog search/filter/cursor pagination | 2 | Catalog | planned | query/isolation/performance tests planned | Never load complete catalog into browser. |
| Inventory list/grid preference | 2 | Catalog/UI | planned | parity/persistence/responsive E2E planned | Approved static implementation is reference. |
| Manufacturer/internal barcode lifecycle and labels | 2 | Barcodes | planned | uniqueness/replacement/print tests planned | Store-scoped uniqueness and assignment history. |
| Draft and atomic confirmed sales | 3 | Sales/Inventory | planned | atomicity/idempotency/concurrency planned | Stock cannot become negative. |
| Camera and hardware barcode sale input | 3 | Sales/Barcodes | planned | E2E/accessibility planned | Scan changes draft only. |
| Unknown-barcode recovery | 3 | Sales/Barcodes | planned | non-mutation E2E planned | Explicit link/create required. |
| Receipt signed upload/private storage | 4 | Receipts/Platform | planned | isolation/file-abuse tests planned | No database blobs. |
| Durable receipt pipeline and OCR adapter/mock | 4 | Receipts/Platform | planned | retry/provider-contract tests planned | Provider details remain internal. |
| Receipt review and atomic idempotent confirmation | 4 | Receipts/Inventory | planned | transaction/idempotency E2E planned | AI proposes; owner confirms. |
| Receipt reversal with compensating movements | 4 | Receipts/Inventory | planned | reconciliation tests planned | Confirmed history is preserved. |
| Action-first dashboard and recent activity | 5 | Dashboard | planned | projection/reconciliation E2E planned | No fabricated zeroes. |
| Reports and simple export | 5 | Reports | planned | reconciliation/export tests planned | Not accounting statements. |
| Notifications and grouping | 5 | Notifications | planned | grouping/history tests planned | Messages include next action. |
| Store-scoped global search | 5 | Search | planned | relevance/isolation tests planned | PostgreSQL search first. |
| Trial/paid plan and billing adapter | 6 | Billing | planned | state/authorization tests planned | Durations/pricing remain configurable. |
| Staff management and owner-only settings | 6 | Stores/Billing | planned | RBAC E2E planned | One adaptive app. |
| Security, accessibility, performance, backup/recovery audit | 7 | Platform/QA | planned | full hardening suite | Baselines begin in Phase 1. |
