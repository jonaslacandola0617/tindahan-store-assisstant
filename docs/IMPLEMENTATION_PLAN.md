# Production implementation plan

## Delivery rule

Each phase is a reviewed vertical slice. Later phases may have documented interfaces or schema placeholders, but their user-visible behavior is not considered implemented until that phase passes its quality gate.

## Phase 0 — audit and reconciliation

Deliver repository audit, traceability matrix, architecture, ADRs, risks, and a safe sequence. Status: complete.

## Phase 1 — foundation

Deliver Next.js App Router, strict TypeScript, Tailwind token foundation, Prisma/PostgreSQL configuration, Auth.js credentials sessions, secure registration, store onboarding, Owner/Staff membership authorization, bilingual cookie/user preferences, Warm Utility shell, error boundaries, structured logging, health check, unit-test foundation, and CI-ready quality commands.

Status: complete on 2026-07-31. See `docs/reports/PHASE_1_REPORT.md`.

Exit gate: lint, type-check, unit tests, production build, migration/schema validation, browser walkthrough of sign-in/onboarding/dashboard, Phase 1 report.

## Phase 2 — inventory and barcodes

Deliver catalog, archive lifecycle, server-side cursor search/filtering, balances and immutable movements, manual adjustments, product details, list/grid preference, manufacturer/internal barcodes, label lifecycle, transactions, reconciliation, and authorization/concurrency tests.

## Phase 3 — sales

Deliver durable draft handling, product selection, camera/hardware barcode input, unknown-code recovery, atomic idempotent confirmation, non-negative stock enforcement, history, and dashboard projection events.

## Phase 4 — receipt intelligence

Deliver signed private uploads, durable jobs, OCR adapter plus deterministic mock, extraction/matching/review, idempotent atomic confirmation, retry, history, and compensating reversal.

## Phase 5 — operating view

Deliver dashboard projections, attention feed, notifications, reports, global search, exports, empty/unavailable states, and reconciliation tests.

## Phase 6 — SaaS readiness

Deliver configurable trial/paid-plan foundation, billing adapter, grace/restricted states, staff invitation management, owner-only billing/settings, export, retention controls, and pilot administration.

## Phase 7 — release hardening

Complete tenant, authorization, concurrency, idempotency, accessibility, responsive, performance, index, upload-abuse, backup/recovery, deployment, monitoring, and end-to-end audits.
