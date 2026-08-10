# TINDAHAN

TINDAHAN is a full-stack store operating assistant built for small neighborhood stores and mini-marts in the Philippines. It brings inventory, sales, barcode scanning, receipt intelligence, reports, staff access, and subscription controls into one focused application without trying to become a full ERP or traditional POS.

**Live app:** https://tindahan.vercel.app

## Highlights

- Product and inventory management with traceable stock movements
- Sales recording with barcode scanning and stock validation
- Supplier receipt scanning with AWS S3, AWS Lambda, and Azure AI Document Intelligence
- Human-reviewed receipt matching before inventory is updated
- Reports, search, low-stock alerts, and CSV exports
- Owner and staff accounts with store-level data isolation
- English and Filipino interface support
- Xendit subscription billing integration and Resend transactional email support
- Private receipt storage, retention controls, and background processing

## Tech stack

Next.js, React, TypeScript, PostgreSQL, Prisma, NextAuth, AWS S3, AWS Lambda, Azure AI Document Intelligence, Xendit, Resend, ZXing, Vitest, Playwright, pnpm, and GitHub Actions.

## Architecture

The application is organized as a modular monolith. Features such as Inventory, Sales, Receipts, Reports, Identity, and Billing keep presentation, application rules, and infrastructure concerns separate. Store context is resolved on the server, important inventory and billing transitions are transactional/idempotent, and OCR suggestions never update stock without user approval.

The approved static prototype in `design/static-prototype/` remains the visual and interaction reference for the production UI.

## Local development

Requirements: Node.js 22 or 24, pnpm 11, and PostgreSQL.

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Use isolated development/test databases only. See `.env.example` for the required environment variables and provider configuration.

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Additional operational commands include `pnpm release:verify`, receipt-retention cleanup, maintenance pruning, and receipt-worker tooling.

## Documentation

- `docs/ARCHITECTURE.md` — application structure and boundaries
- `docs/PRD_TRACEABILITY.md` — product requirements mapped to implementation
- `docs/receipts/README.md` — receipt processing and recovery flows
- `docs/billing/README.md` — subscription and billing behavior
- `docs/operations/DEPLOYMENT_CHECKLIST.md` — deployment checks
- `docs/operations/PRODUCTION_RUNBOOK.md` — operational procedures
- `docs/adr/` — architectural decisions
- `design/` — design system, interaction specifications, and approved prototype

## Status

TINDAHAN is currently maintained as a release-candidate/test-mode SaaS project. Core application workflows are implemented; payment and provider-level production activation remain environment/account decisions rather than missing application features.
