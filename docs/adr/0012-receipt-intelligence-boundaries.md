# ADR 0012: Receipt Intelligence boundaries

## Status

Accepted — 2026-08-02.

## Decision

Receipt Intelligence remains inside the modular monolith. The application creates a store-scoped Receipt before issuing a short-lived direct-upload target. Original images live in private object storage and are read only through authorized, expiring links. PostgreSQL stores file metadata, normalized extraction, review state, matching evidence, confirmation, aliases, job state, and immutable stock history.

Extraction is behind a provider-neutral interface. Local development and tests use a deterministic mock; production uses a configured adapter. Durable `JobRun` records are claimed idempotently and can be processed by the bundled worker or awakened through an authenticated webhook. Provider schemas, confidence values, and queue details stay inside infrastructure.

Only explicit receipt confirmation may alter inventory. Confirmation is serializable, store-scoped, idempotent, and appends immutable movements. Owner reversal appends compensating movements and preserves the original receipt, lines, confirmation, and movements.

## Consequences

- OCR providers and storage vendors can change without changing Receipt domain or UI contracts.
- Database and private storage must be backed up and retained together.
- The local process rate limiter is a development safety default; multi-instance production deployments should enforce the same boundary in a shared gateway.
- Full provider operations, hosted worker scheduling, retention execution, and external metrics export remain deployment responsibilities, not owner-facing settings.
