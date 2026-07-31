# Architecture

## System shape

Tindahan begins as a modular monolith deployed as one Next.js application with one PostgreSQL database. Modules communicate through application services and explicit domain events; they do not reach into each other's persistence internals.

```text
Browser
  -> Presentation (App Router pages, route handlers, server actions)
  -> Application (use cases, authorization, transactions, idempotency)
  -> Domain (entities, policies, state transitions, ports)
  -> Infrastructure (Prisma/PostgreSQL, Auth.js, object storage, jobs, OCR, logs)
```

## Module ownership

- Identity: users, credentials, sessions.
- Stores: stores, memberships, preferences, role policies.
- Catalog: products, categories, suppliers, lifecycle, units.
- Barcodes: assignment, lookup, generation, labels, history.
- Inventory: authoritative balance and immutable movements.
- Sales: drafts, confirmed sales, sale lines.
- Receipts: files, extraction, matching, review, confirmation, reversal.
- Dashboard/Reports/Search/Notifications: derived read models only.
- Billing: subscription state through a provider adapter.
- Audit: actor/store/action/correlation records.
- Platform: environment, logging, rate limits, storage, jobs, OCR, health.

## Dependency rules

Presentation may call application services and read presentation DTOs. Application services depend on domain policies and ports. Infrastructure implements ports. Domain code imports no framework, Prisma, provider SDK, or React API. Prisma types are not public API contracts.

## Tenant isolation

The authenticated user ID is resolved from the signed server session. Active store and role are resolved from `StoreMembership`; client-provided store IDs are never trusted. Repositories require a server-created `StoreContext`, and every store-owned query includes `storeId`. Owner-only operations also require the Owner role. Cross-store authorization tests are mandatory.

## Data integrity

InventoryBalance is the current authority; every change also creates one immutable InventoryMovement in the same transaction. A version column supports optimistic checks, and decrement operations use conditional writes to prevent negative stock. Sale and receipt confirmations are atomic and guarded by store-scoped idempotency keys. Corrections append compensating records.

## Presentation and state

Server Components render by default. Client Components are limited to genuine interaction such as language/theme controls, dialogs, scanners, and complex forms. URL state owns search/filter/sort/cursor state. Server state is not copied into global client stores. User presentation preferences are persisted server-side and mirrored to cookies for immediate rendering.

## Provider ports

Private object storage, durable jobs, OCR, billing, logging/error monitoring, and barcode generation are accessed through stable interfaces. Development and automated tests use deterministic local/mock implementations.

## Security baseline

Secure HttpOnly session cookies are owned by Auth.js. Passwords use Node's scrypt with a per-user random salt and constant-time comparison. Runtime input is validated with Zod. Security headers are emitted globally. Logs exclude credentials, receipt contents, and signed URLs. Production rejects demo authentication and missing required secrets.

## Observability

Each request receives or propagates a correlation ID. Structured logs include level, event, correlation ID, actor/store identifiers when safe, and sanitized metadata. Business-critical operations later record AuditEvent and IdempotencyKey rows.
