# ADR 0014: Release hardening and operational safety

## Status

Accepted on 2026-08-09.

## Context

TINDAHAN now contains the complete V1 workflow. A production release needs shared abuse controls, safe diagnostics, explicit readiness checks, retained audit history, recoverable operations, and repeatable deployment gates. Process-local throttles and ad hoc deployment checks are insufficient when more than one application instance is running.

## Decision

- Production request throttling is stored in PostgreSQL using hashed subjects and fixed windows. Memory throttling is restricted to automated tests.
- Authentication and mutation routes apply bounded request limits without storing raw email addresses or IP-derived subjects.
- Logs are structured, size-bounded, and recursively redact credentials, tokens, authorization material, cookies, signed URLs, and control characters.
- `/api/health` is liveness-only. `/api/ready` verifies database reachability and is the deployment readiness signal.
- Release verification is a read-only command that checks tenant ownership, inventory-ledger reconciliation, and confirmed-sale/receipt invariants.
- Receipt-photo retention deletes only eligible private objects and marks metadata as purged; structured receipt, inventory, and audit history remains.
- Expired rate-limit and idempotency caches have an explicit bounded pruning command.
- CI uses Node.js 22 and executes migrations, lint, generated route types, TypeScript, tests, and the production build.
- Production deployment follows the checked-in runbook and checklist. Backups are provider-managed, restore drills occur in an isolated database, and rollback never reverses an applied migration destructively.

## Consequences

The application can scale across instances without bypassing abuse controls, while operational checks remain deterministic and privacy-safe. PostgreSQL becomes an availability dependency for production rate limiting, which intentionally fails closed. Operators must schedule retention and pruning commands, configure monitoring for liveness/readiness and job failures, and rehearse database restoration.

