# Tindahan

Tindahan is a Store Operating Assistant for independent Philippine retailers. This repository contains two intentionally distinct artifacts:

- The approved static prototype in `design/static-prototype/`. It remains the visual and interaction contract and must be consulted for every production UI implementation.
- The production Next.js application under `src/`, backed by PostgreSQL and Prisma.

## Production application

Requirements: Node.js 20.19 or newer, pnpm, and PostgreSQL.

1. Copy `.env.example` to `.env` and replace every required value. Prisma reads `.env`; Next.js also loads it.
2. Install dependencies with `pnpm install`.
3. Generate the Prisma client with `pnpm db:generate`.
4. Apply migrations with `pnpm db:migrate`.
5. Seed a reproducible local owner with `pnpm db:seed`.
6. Start the application with `pnpm dev`.

The seed account is `owner@example.test` with password `change-this-demo-password`. Change or remove it outside local development.

### Database connections

- `DATABASE_URL` is the pooled connection used by the running application.
- `DIRECT_URL` is the unpooled connection used by `pnpm db:migrate` and `pnpm db:migrate:dev`.
- `TEST_DATABASE_URL` is the isolated runtime connection used by database-backed tests. `TEST_DIRECT_DATABASE_URL` is optional for migrations; when omitted for a Neon pooled URL, the migration helper safely resolves the matching direct host while preserving the test branch and database.

The legacy name `TEST_DATABASE` is accepted for the current local setup, but `TEST_DATABASE_URL` is preferred for new environments.

Never point `TEST_DATABASE_URL` at a development or production database. Database-backed tests use the isolated schema named in that URL. Prepare it with `pnpm db:migrate:test`; unit tests do not require a database.

The seed also creates a small barcode-ready catalog for the Sales workflow without overwriting existing products. Open `/sales/new` to search, scan, or record a sale. Camera recognition depends on browser `BarcodeDetector` support; manual entry and compatible keyboard-style scanners remain available everywhere.

To populate an existing Owner store with an idempotent report-demo catalog and confirmed sales, run `pnpm db:seed:reports -- --email owner@example.com`. Add `--dry-run` to verify the account, store, role, and planned fixture counts without writing data.

Receipt capture is available at `/receipts/new`. Explicit local development may use private local storage and deterministic extraction; production uses the configured private AWS S3 bucket and Azure AI Document Intelligence settings listed in `.env.example`. Run `pnpm receipts:worker` for the persistent database-backed processor or `pnpm receipts:worker:once` to drain one batch. Fixture names, cloud setup, and recovery cases are documented in `docs/receipts/README.md`.

Phase 7 settings are available at `/settings`. Owners can update store details, notification defaults, receipt-photo retention, view their plan state, and create revocable Staff invitation links. Staff can update only their own account, language, theme, and password; store, retention, team, and plan controls remain owner-only. Invitation tokens are shown once for sharing and stored only as hashes. The pilot billing target is intentionally manual and provider-neutral—there is no fake checkout. An authorized operator can change a pilot store state with `pnpm pilot:store -- --email=owner@example.com --status=ACTIVE`; every transition is audited. Supported states are `TRIALING`, `ACTIVE`, `GRACE`, `RESTRICTED`, and `CANCELED`.

Existing stores are migrated to active pilot access. New stores begin a trial using `TRIAL_DAYS`; `BILLING_GRACE_DAYS` controls the writable grace period. Restricted and canceled stores remain readable and exportable, while inventory, sales, and receipt mutations are rejected centrally. `STAFF_INVITE_TTL_DAYS` bounds invitation lifetime. These variables are server-only and must never use a `NEXT_PUBLIC_` prefix.

For UI-only development without PostgreSQL, set `AUTH_DEMO_MODE=true` and provide the demo credentials documented in `.env.example`. Demo mode is rejected when `NODE_ENV=production`.

## Quality commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Architecture, phased delivery, traceability, and decisions are documented in `docs/`.
