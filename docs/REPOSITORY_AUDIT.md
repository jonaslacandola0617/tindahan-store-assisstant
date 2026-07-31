# Repository audit

## Audit date and scope

Audit performed July 31, 2026 against the complete workspace, PRD v2.2, visual identity v1.0, all seven prototype design documents, fourteen HTML screens, shared CSS/JavaScript, mock data, and browser-rendered routes.

## State before production implementation

The repository was a polished static prototype only. It contained fourteen HTML pages, six CSS files, four JavaScript files, an icon sprite, three image assets, design documentation, the PRD, and a reference ZIP. It had no package manifest, framework runtime, TypeScript, database schema, migrations, authentication, server authorization, API boundary, tests, deployment configuration, health endpoint, structured logging, or environment validation. No `AGENTS.md` or `README.md` existed. During production setup, the complete prototype was moved intact to `design/static-prototype/`; that folder remains the visual source of truth.

## Reusable assets

- The complete application shell, navigation behavior, breakpoint map, page hierarchy, copy, and state patterns.
- Warm Utility tokens, including intentional WCAG corrections.
- Component anatomy for buttons, cards, rows, fields, badges, dialogs, drawers, empty states, and responsive navigation.
- Barcode, sale, receipt-review, and inventory-toggle interaction contracts.
- Deterministic mock scenarios useful as future automated fixtures.

## Prototype-only assumptions to remove internally

- Store ownership and identity are hardcoded.
- Product, sales, receipt, and notification data are duplicated or embedded in HTML/JavaScript.
- Mutations are simulated and reset on reload.
- Product and receipt detail pages are single hardcoded examples.
- Search and filtering load the entire catalog into the browser.
- Theme and language are browser-only state.
- Camera, storage, OCR, jobs, printing, and downloads are demonstrations rather than durable services.

## Risks

1. Visual drift during React migration. Mitigation: retain the static pages and compare required viewports.
2. Tenant-data leakage. Mitigation: derive store context from server membership and test cross-store denial.
3. Inventory corruption under retries or concurrency. Mitigation: immutable movements, transactional balance updates, version checks, and idempotency keys in Phase 2–4.
4. Premature infrastructure complexity. Mitigation: modular monolith and provider ports.
5. Auth.js Credentials does not create users. Mitigation: a dedicated registration use case hashes passwords and creates users; Auth.js validates credentials and owns signed sessions.
6. No PostgreSQL service is bundled in this workspace. Mitigation: migration/schema/build verification now; database integration verification requires a configured test database.

## Reconciliation decisions

- The PRD controls behavior; the prototype controls rendered presentation.
- The prototype remains intact at `design/static-prototype/` as an auditable reference. Production code is additive and uses stable production routes.
- Prisma 7 is selected because Prisma Next is still early access; Prisma 7 remains the vendor-recommended production line.
- Phase 1 establishes identity, tenancy, preferences, shell, and quality gates only. Inventory and later modules remain planned, despite their schema ownership being documented.

## Browser audit

All fourteen prototype pages loaded at 1280px with their expected titles, primary hierarchy, and navigation pattern. Browser console warnings/errors: none. The required responsive and interaction behaviors remain documented in `design/` and are the regression baseline.
