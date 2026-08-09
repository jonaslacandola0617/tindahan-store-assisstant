# Phase 8 implementation report

## Outcome

Phase 8 release hardening is complete. The application now has shared abuse controls, privacy-safe observability, liveness and readiness endpoints, retention and operational maintenance commands, deployment/incident runbooks, dependency remediation, a repeatable CI gate, and verified handling for stale authenticated sessions during onboarding.

The static prototype remains unchanged and remains the visual source of truth.

## Implemented changes

1. **Shared rate limiting**
   - Added database-backed fixed-window buckets with hashed subjects.
   - Applied limits to credentials sign-in, account/store registration, invitation acceptance, password changes, and receipt upload initialization.
   - Production rejects the memory-only provider.
2. **Security and privacy-safe diagnostics**
   - Added recursive redaction and bounded structured logging.
   - Added request correlation IDs to business HTTP failures.
   - Added CSP, framing, MIME, referrer, permissions, opener, resource, and production transport headers.
3. **Operational health**
   - Kept `/api/health` as liveness and added database-backed `/api/ready` readiness.
   - Added `pnpm release:verify` for tenant, ledger, sale, and receipt integrity checks.
4. **Retention and maintenance**
   - Added `ReceiptFile.purgedAt` and an indexed, dry-run-first receipt-photo retention executor.
   - Added bounded pruning for expired rate-limit and idempotency records.
5. **Release automation**
   - Added a Node.js 22 CI workflow with PostgreSQL, migrations, lint, generated route types, TypeScript, tests, and build.
   - Pinned the supported runtime range to Node.js 22 through 24.
6. **Dependency remediation**
   - Upgraded Next.js, AWS SDK, type packages, and supporting tools.
   - Centralized patched transitive overrides in `pnpm-workspace.yaml`.
   - Production dependency audit reports no known vulnerabilities.
7. **Identity recovery**
   - Onboarding now verifies that a JWT user still exists before treating a browser as authenticated.
   - A stale session left after a database reset no longer causes a foreign-key failure; the account-creation flow proceeds normally.
8. **Navigation and accessibility maintenance**
   - Replaced internal full-page registration and receipt navigation with App Router navigation.
   - Confirmed skip links, landmarks, named controls, alert/status regions, password visibility controls, responsive navigation contracts, and reduced-motion rules.

## Database changes

- `RateLimitBucket` stores hashed, expiring fixed-window counters and optional store scope.
- `ReceiptFile.purgedAt` records private-photo deletion without deleting business history.
- Migration: `20260809_phase8_release_hardening`.
- The migration was applied successfully to the configured development and isolated test schemas.

## Security controls

- Store identity continues to come from the signed server session and active membership, never a client-supplied Store ID.
- Raw throttling subjects, passwords, access keys, API keys, cookies, authorization headers, and signed URLs are not persisted in logs.
- Receipt objects remain private; retention validates protected keys before deletion.
- Request limits return `429` with `Retry-After` and `no-store`.
- Production rate limiting requires PostgreSQL and does not silently fall back to process memory.

## Browser and journey audit

A live local audit used a temporary account and empty store to verify:

- registration fields and password visibility controls;
- store onboarding and preferences;
- automatic credential sign-in;
- dashboard, inventory, sales, record-sale, receipt queue/upload, reports, search, and settings routes;
- skip navigation, landmarks, headings, named form controls, filter/view state, disabled actions, and empty states.

The temporary audit store and account were deleted after verification. The audit discovered the stale-session onboarding case described above; the corrected flow then completed successfully.

## Commands executed

- `pnpm install --lockfile-only`
- `pnpm install --offline --frozen-lockfile`
- `pnpm audit --prod`
- `pnpm db:generate`
- `pnpm db:validate`
- `pnpm db:migrate`
- `pnpm db:migrate:test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm release:verify`

## Verification results

- Lint: passed with zero warnings.
- TypeScript and generated route types: passed.
- Prisma schema: valid.
- Full automated suite: **37 files passed, 136 tests passed; 1 opt-in cloud smoke test skipped by design**.
- Production build: passed; 41 static page-generation tasks completed and all application routes were emitted.
- Release integrity verifier: ready; zero owner, ledger, confirmed-receipt, or confirmed-sale failures.
- Production dependency audit: no known vulnerabilities.

The live AWS/Azure smoke test was not rerun during Phase 8, so this report does not claim a new live-provider result. Existing provider architecture and configuration were not replaced.

## Operations and recovery

- Production runbook: `docs/operations/PRODUCTION_RUNBOOK.md`.
- Deployment checklist: `docs/operations/DEPLOYMENT_CHECKLIST.md`.
- Receipt retention defaults to dry-run and requires `--execute` for deletion.
- Backup restoration must target an isolated database first, followed by migrations, `pnpm release:verify`, application smoke checks, and explicit cutover approval.
- Rollback uses application rollback plus forward-compatible migrations; destructive database rollback is prohibited.

## Known operational constraints

- Provider-managed PostgreSQL backups and alerting still require deployment-account configuration and cannot be proven from repository tests alone.
- Exact production origins must be present in the private S3 CORS policy.
- The trusted ingress must overwrite forwarding headers before they are used as one component of anonymous request throttling.
- The documented PostgreSQL client warning about future `sslmode=require` semantics should be resolved by using `sslmode=verify-full` in managed connection strings before the next major `pg` connection-string change.

## Manual release verification

1. Configure server-only production environment variables and `RATE_LIMIT_PROVIDER=database`.
2. Apply migrations with the direct production connection.
3. Run `pnpm release:verify` against the intended deployment database.
4. Deploy the exact commit and verify `/api/health` and `/api/ready` independently.
5. Create a permitted test account/store, add stock, record a sale, upload and review a receipt, explicitly confirm it, and reconcile the movement history.
6. Verify cross-store access is denied and private receipt URLs expire.
7. Confirm alerts for readiness, elevated 5xx/429 rates, failed receipt jobs, and database availability.
8. Run a receipt-retention dry run and review its counts before scheduling execution.

