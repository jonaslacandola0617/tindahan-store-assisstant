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
5. Start the application with `pnpm dev`.

### Database connections

- `DATABASE_URL` is the pooled connection used by the running application.
- `DIRECT_URL` is the unpooled connection used by `pnpm db:migrate` and `pnpm db:migrate:dev`.
- `TEST_DATABASE_URL` is the isolated connection used by `pnpm db:migrate:test` and database-backed tests.

The legacy name `TEST_DATABASE` is accepted for the current local setup, but `TEST_DATABASE_URL` is preferred for new environments.

Never point `TEST_DATABASE_URL` at a development or production database. Unit tests do not require a database; future integration tests automatically replace the runtime connection with `TEST_DATABASE_URL` when it is present.

For UI-only development without PostgreSQL, set `AUTH_DEMO_MODE=true` and provide the demo credentials documented in `.env.example`. Demo mode is rejected when `NODE_ENV=production`.

## Quality commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Architecture, phased delivery, traceability, and decisions are documented in `docs/`.
