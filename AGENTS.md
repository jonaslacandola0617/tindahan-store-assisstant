# Tindahan repository instructions

## Authority

1. `docs/Store_Operating_Assistant_PRD_v2.2_Professional_Edition.docx` is the product and behavior authority.
2. `design/static-prototype/` is the immutable visual and interaction authority for every production implementation.
3. `docs/design/VISUAL_IDENTITY_V1.md` and `design/` define tokens, accessibility corrections, responsive behavior, and component contracts.
4. ADRs in `docs/adr/` govern production architecture unless superseded by a newer accepted ADR.

## Phase boundary

Work only in the currently authorized phase. Do not implement later-phase domain behavior merely because a route or schema exists. A phase is complete only after lint, type-check, tests, build, documentation, and an honest phase report.

## Architecture

- Use a modular monolith with presentation, application, domain, and infrastructure boundaries.
- Organize production code by business capability under `src/modules/`.
- Presentation code must not import Prisma or provider SDKs directly.
- All store-owned access is resolved from the authenticated server session and membership, never from an untrusted client store ID.
- Business writes use typed application services, authorization, validation, and idempotency where retries could duplicate effects.
- Inventory movements, confirmed sales, and confirmed receipt effects are immutable. Corrections are compensating records.

## UI preservation

- `design/static-prototype/` is read-only reference material unless a task explicitly targets it. Always compare production UI work with the matching prototype page at this location; moving it here did not reduce its authority.
- Reuse the Warm Utility tokens and approved component anatomy. Do not introduce library-default styling.
- Keep one dominant primary action per screen, 44px touch targets, visible focus, bilingual copy, and the documented responsive navigation pattern.
- Never expose provider names, queue terms, confidence scores, database concepts, or internal IDs in owner-facing copy.

## Verification

- Add tests with each business rule.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before declaring a phase complete.
- Never claim a check passed unless its command completed successfully.
- Preserve secrets outside source control and use `.env.example` for documented configuration.
