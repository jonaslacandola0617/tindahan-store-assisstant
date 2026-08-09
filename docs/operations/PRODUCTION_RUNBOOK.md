# Tindahan production runbook

## Release gate

Before every production release:

1. Confirm the approved production environment values exist in the hosting platform. Never copy `.env` into an image or repository.
2. Run `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` in CI.
3. Back up PostgreSQL and record the provider snapshot identifier before applying a migration.
4. Apply migrations with `pnpm db:migrate` through the direct database connection.
5. Run `pnpm release:verify` against the target database. A non-zero exit blocks release.
6. Deploy the application and receipt worker from the same commit.
7. Verify `/api/health` returns 200 and `/api/ready` returns 200.
8. Perform the smoke journey: sign in, read Dashboard, create and archive a temporary product, record a test sale only in an approved test store, upload a permitted receipt fixture, confirm private image access, and remove/reverse the test records through supported workflows.

## Monitoring and alerts

Monitor the application and worker using their JSON logs. Alert on:

- `/api/ready` returning 503 for two consecutive checks;
- elevated HTTP 500 or 429 rates;
- `receipt_request_failed`, `readiness_check_failed`, `receipt_retention_failed`, or worker failures;
- receipt jobs remaining `RUNNING` beyond the worker timeout or exhausting attempts;
- database connection saturation, storage errors, or Azure throttling/quota events;
- unexpected growth in failed jobs, expired rate-limit rows, or private receipt objects.
- billing webhooks left received for more than 15 minutes, failed billing webhooks, paid transactions without statements, payment failures, or failed transactional email deliveries.

Logs may contain store, receipt, job, correlation, and request identifiers needed for operations. They must not contain receipt text, passwords, cookies, authorization headers, API keys, credentials, or presigned URLs. Restrict log access and retention through the hosting platform.

## Backup and restore

- Enable managed PostgreSQL point-in-time recovery and daily snapshots. Keep the retention period aligned with the approved operational policy.
- Keep the S3 bucket private, versioned when approved, encrypted, and protected from public access. Receipt-photo lifecycle deletion follows the owner-selected retention date; structured receipt and inventory history remains in PostgreSQL.
- Test restore into an isolated recovery database at least quarterly. Never restore over production as the first test.
- After restore, run migrations in deploy mode, `pnpm release:verify`, and read-only reconciliation checks before allowing traffic.
- Record recovery point objective, recovery time objective, snapshot identifier, restore duration, verifier result, and approver in the operations log.

## Receipt retention

Run `pnpm receipts:retention` first in dry-run mode. Review the eligible count, then run `pnpm receipts:retention -- --execute` from a trusted scheduled worker. The command validates every server-generated object key before deletion, removes only expired receipt photos, marks the file as purged, and preserves receipt lines, confirmations, audit events, sales, and inventory movements.

Install or review the bucket safety net with `pnpm receipts:lifecycle -- --bucket=<existing-private-bucket>`. Only after reviewing the current and resulting rule counts, repeat with `--execute`. The operator needs bucket-scoped lifecycle Get/Put permissions; the application identity does not. Never replace the bucket's unrelated rules by hand.

Schedule `pnpm maintenance:prune` daily to remove expired rate-limit buckets and expired idempotency response caches. It never removes sales, receipts, audit events, inventory movements, or current balances.

## Incident response

1. Stop or restrict writes when integrity is uncertain; do not delete history.
2. Capture request/correlation identifiers and the affected store/time range without copying receipt content into tickets.
3. Check readiness, database health, worker status, and provider status.
4. Retry only idempotent supported operations. Use compensating sale/receipt corrections for confirmed business records.
5. Restore service, run `pnpm release:verify`, and document impact and remediation.

## Rollback

Application rollback means deploying the last known-good immutable build. Database migrations are forward-only; do not use destructive schema rollback commands. If a migration causes an incident, stop writes, restore an approved snapshot into an isolated database, validate it, and follow the database provider's controlled recovery procedure.

For Xendit incidents, preserve received webhook rows, restore the provider connection or configuration, then redeliver the original test/provider event. Never activate a plan manually from a browser return. For Resend incidents, the owner may use the one-time copy-link fallback; resend creates a new token and revokes the old token. Rotate exposed provider credentials in the provider Dashboard and deployment secret store, redeploy, and record the incident without copying secret values.
