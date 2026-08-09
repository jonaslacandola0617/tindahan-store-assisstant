# Loading System Implementation Report

## Outcome

TINDAHAN now uses one production loading language across active workflows while preserving the static prototype’s Warm Utility visual identity. Small operations use an inline spinner plus a direct task message. Route transitions use the Tindahan store mark and the localized “Loading Tindahan” label.

## Authorities reviewed

- `docs/Store_Operating_Assistant_PRD_v2.2_Professional_Edition.docx`
- `design/static-prototype/` (immutable visual and interaction authority)
- Design system, component, interaction, accessibility, and responsive specifications in `design/`
- Internationalization ADR and PRD traceability matrix

## Audit scope

The audit covered sign-in, onboarding, authenticated navigation, inventory list/grid/search/filter/pagination, add product, category suggestions, barcode scanning, product stock/details/barcodes/archive, sales history/filter/pagination, record sale, camera scanning and recovery, sale confirmation, and sale correction.

## Shared architecture

- `LoadingIcon`: compact or standard spinner using the existing icon system.
- `InlineLoading`: icon plus specific text for controls and compact regions.
- `SectionLoading`: centered status within an existing content region.
- `LoadingButtonContent`: stable button content with compact spinner and verb.
- `TindahanRouteLoading`: branded route-level loader for viewport or app main region.
- Central EN/FIL message keys keep pending copy consistent.

## Route-level loading

The root boundary handles initial public-route loading. The authenticated boundary keeps the application shell present and loads only the main region, avoiding a full-page flash during navigation.

## Active workflow coverage

- Sign-in: “Signing in” / “Nagsa-sign in.”
- Onboarding: “Setting up your store” / “Inihahanda ang iyong tindahan.”
- Inventory: product search/filter refresh, empty-region loading, pagination, add product, category suggestions, stock updates, detail saves, barcode generation/replacement, and archive confirmation.
- Sales: history loading, range changes, pagination, product search, barcode recognition, link/create recovery, sale confirmation, and sale correction.
- Preferences: the constrained EN/FIL segmented control uses an icon with a localized screen-reader label.

Buttons retain their dimensions and task context while pending. Duplicate writes are blocked, existing idempotency keys remain in place, and entered data is retained on failure.

## Accessibility and motion

Affected regions and controls expose busy semantics. Visible status messages use polite announcements. The icon accompanies readable text except in the documented constrained language control. Loading is not communicated by animation alone, and all loading animation stops when reduced motion is requested.

The motion correction uses two distinct canonical animations. Compact loader icons rotate clockwise at a steady 0.8-second linear cadence without scale, pulse, bounce, or wobble. The route loader uses the approved storefront SVG’s exact three paths and measured path lengths: the awning, store outline, and door draw with overlapping offsets across a 2.6-second loop, hold as a complete mark, and fade softly before reset. The reference GIF informed timing only; its blue palette and unrelated geometry were not copied.

### Runtime visibility correction

The initial route boundaries were awaiting `cookies()` to choose their label before returning the fallback. Because a loading boundary must be immediately renderable, that asynchronous dependency could let a fast local route finish before the loader itself appeared. Both route boundaries are now synchronous. They render EN and FIL labels immediately and let the root document’s existing `lang` attribute select the visible message. The compact spinner also keeps its approved two-arc geometry while using a restrained opacity difference between arcs, making clockwise rotation perceptible without adding pulse or color changes.

## Prototype compatibility

Warm Utility colors, typography, spacing, radii, button anatomy, cards, and layout remain authoritative. The production system deliberately does not use the prototype’s dormant skeleton markup or spinner-only `.btn-loading` rule because the redesign requires readable task context. The immutable prototype files were not edited.

## Deferred features

Receipts, reports, notifications, billing, team management, and expanded settings are not active in the current phase. They receive only truthful route-transition loading; no fake processing, upload, or confirmation behavior was added.

## Verification results

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- Loading-system component tests: 5 passed, including canonical spin keyframes and the three-path stroke sequence.
- `pnpm build`: passed; all 30 application and API routes compiled.
- Full `pnpm test`: 39 tests passed and 15 database integration tests were skipped after both integration suites failed during database setup/cleanup with Prisma request errors. This is an existing test-database access/setup condition, not a loading-system assertion failure.
- `git diff --check`: passed; only line-ending notices were emitted.
- Automated localhost visual interaction was attempted in the in-app browser, but browser URL policy blocked localhost access. No bypass was used and no visual-pass claim is made. The implementation was instead checked against the immutable prototype, shared design contracts, rendered-component output, TypeScript, lint, and production compilation.
