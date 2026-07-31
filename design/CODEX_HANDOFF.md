# Codex Handoff — Tindahan Frontend

**This is a frontend implementation task, not a new design task. Do not
reinterpret, simplify, restyle, or redesign the approved prototype.**

Everything in this repository — HTML structure, CSS, copy, spacing,
component states, and interaction behavior — is the approved visual and
interaction source of truth. Your job is to reproduce it faithfully inside
the real application (real backend, real auth, real data, real receipt
-processing pipeline), not to reinterpret it.

---

## 1. Exact file map

The complete approved prototype now lives at `design/static-prototype/`. This
location is the visual source of truth for the production application; always
open the matching page here before implementing or reviewing production UI.

```
tindahan-static-prototype/
├── index.html              Sign in (standalone layout, no app shell)
├── onboarding.html          First-run setup wizard (standalone layout)
├── dashboard.html           Dashboard (app shell)
├── inventory.html           Inventory list + filters (app shell)
├── product-details.html     Single product detail (app shell, back-nav)
├── sales.html                Sales history (app shell)
├── record-sale.html         Record-sale workflow (app shell, back-nav)
├── receipts.html             Receipts list (app shell)
├── receipt-upload.html      Scan/upload a receipt (app shell, back-nav)
├── receipt-review.html      Hero receipt-review workflow (app shell, back-nav)
├── reports.html               Reports (app shell)
├── notifications.html        Notifications (app shell)
├── search.html                 Search (app shell)
├── settings.html               Settings (app shell)
├── assets/
│   ├── icons/sprite.svg     Canonical icon set (44 icons) — reference only;
│   │                        pages inline these symbols directly, see §4
│   └── images/tindahan-logo.svg   Wordmark lockup
├── css/
│   ├── tokens.css           Design tokens — the ONLY place colors/spacing/
│   │                        radii/shadows/motion/type scale are defined
│   ├── base.css             Resets, base element styles, focus, a11y utilities
│   ├── components.css       Every reusable component (buttons, cards, etc.)
│   ├── layouts.css          App shell: sidebar, topbar, content grid
│   ├── pages.css            Small page-specific overrides
│   └── responsive.css       All breakpoint behavior (loaded last — order matters)
├── js/
│   ├── app.js                Theme/language toggles, modals, drawer, toasts, popovers
│   ├── navigation.js        Active-nav-state logic (data-page / data-nav)
│   ├── interactions.js      Page-level behavior (steppers, filters, receipt
│   │                        review, dropzone, record sale, notifications, search)
│   └── mock-data.js          Sample data — DO NOT ship to production; replace
│                              with real API calls (see §9)
└── design/                   This documentation set
```

## 2. Screen → route mapping

| File | Suggested production route |
|---|---|
| `index.html` | `/sign-in` |
| `onboarding.html` | `/onboarding` |
| `dashboard.html` | `/` (default authenticated route) |
| `inventory.html` | `/inventory` |
| `product-details.html` | `/inventory/:productId` |
| `sales.html` | `/sales` |
| `record-sale.html` | `/sales/new` |
| `receipts.html` | `/receipts` |
| `receipt-upload.html` | `/receipts/new` |
| `receipt-review.html` | `/receipts/:receiptId/review` |
| `reports.html` | `/reports` |
| `notifications.html` | `/notifications` |
| `search.html` | `/search` |
| `settings.html` | `/settings` |

`product-details.html` and `receipt-review.html` are single static
examples in this prototype (Fresh Eggs, Medium / a Home Table Foods
receipt) — they represent the pattern for **any** product or receipt, not
a specific one. Codex must template these against real IDs.

## 3. Reusable component map

Every component is documented in `COMPONENT_INVENTORY.md` with anatomy,
states, and misuse warnings. Treat that document as authoritative for
component behavior; treat the rendered HTML in each page as the
authoritative markup pattern for how components compose together.

## 4. Design token mapping

`design/static-prototype/css/tokens.css` is the prototype token source of truth. **Do not hardcode any hex
color, pixel spacing/radius value, shadow, or transition duration
anywhere else** — reference the CSS custom property. If your framework
needs a JS-side token mirror (e.g. for a charting library or a
React/Vue design-token file), generate it from `tokens.css`, not by
re-eyeballing the rendered pages.

One deliberate technical decision to preserve: the icon `<symbol>`
definitions are inlined into every page's `<body>` rather than referenced
via an external `<use href="assets/icons/sprite.svg#id">`. This was
required for the static prototype to work when opened as a local file, but
it is **not** a requirement for the production app — once you have a real
build pipeline, referencing a single shared sprite (or a component-based
icon system) is preferred and will not regress anything visual.

## 5. Required responsive behavior

Full breakpoint-by-breakpoint behavior is in `RESPONSIVE_BEHAVIOR.md`.
The load-bearing rules to not regress:

- Sidebar → forced icon rail at tablet landscape → hidden + bottom nav at
  ≤820px. This is a hard navigation-pattern change, not a fluid resize.
- `receipt-split` and `dash-grid` stack to one column at ≤1180px; the
  receipt photo loses its sticky position on that stack.
- Every interactive control stays ≥44×44px at every breakpoint — this is
  the single most important accessibility requirement to hold constant
  through a redesign of the underlying markup.

## 6. Required interaction behavior

Full contract in `INTERACTION_SPECIFICATION.md`. The three rules that are
product-critical, not just visual polish:

1. **Receipt Review's confirm button must stay disabled until every line
   item is resolved.** This is a data-integrity rule, not a UI nicety —
   it's what makes "inventory updates only after confirmation" true.
2. **Record Sale's confirm button must stay disabled with zero line
   items**, and must show a specific, named warning when a requested
   quantity exceeds stock on hand (not a generic error).
3. **No confidence score is ever rendered anywhere in the receipts flow.**
   If your OCR/matching pipeline produces a confidence number, it stays
   server-side and only ever surfaces to the owner as one of the four
   plain-language states (ready / check this / new / couldn't read).

## 7. Required accessibility behavior

Full detail is in `ACCESSIBILITY_SPECIFICATION.md`. Preserve these two
implemented requirements in the production build:

1. Modal and drawer focus is trapped (Tab/Shift+Tab cycle within the open
   overlay, and focus returns to the trigger on close).
2. The two adjusted color tokens (`--color-border-strong`,
   `--color-warning-text`) and the new `--color-accent-strong` token are
   intentional deviations from a literal reading of the original visual
   -identity spec, made to pass WCAG AA contrast. Do not "fix" them back
   toward the original hex values — that would reintroduce a real
   accessibility failure. See `DESIGN_SYSTEM.md` §6 for the measurements.

## 8. Visual QA checklist (run this against every screen you build)

- [ ] Matches the prototype's spacing, type scale, and color usage exactly
      (compare side-by-side at 1440 / 1280 / 1024 / 768 / 390px)
- [ ] Exactly one `.btn-primary`-equivalent visible per screen
- [ ] Every status is icon + word, never color alone
- [ ] Every icon-only control has an accessible name
- [ ] Tab order and focus rings match (no removed outlines)
- [ ] Touch targets ≥44×44px on the mobile build
- [ ] Empty / loading / error / success states all implemented, not just
      the "happy path" shown in the static data
- [ ] No enterprise-dashboard patterns crept in (dense grids, stat-card
      walls, icon-only nav, confidence percentages)

## 9. What existing business logic must be preserved

The static prototype has **no backend**, so "business logic" here means
the *rules the UI enforces*, all of which must carry over exactly:

- Receipt confirmation gated on zero unresolved line items.
- Sale confirmation is gated on at least one line item and zero insufficient
  stock conflicts. Over-stock lines must be reduced or removed.
- Stock adjustment requires a reason.
- Inventory status (`ok` / `low` / `out`) is derived from quantity vs.
  each product's reorder point — reproduce this as a computed field, not
  a manually-set flag, so it can never drift out of sync with quantity.

## 10. What Codex is prohibited from redesigning

- Any token in `tokens.css` (colors, spacing, radii, shadows, motion,
  type scale) without a documented accessibility or platform-constraint
  reason, logged the same way §7 above is logged.
- The five-section Dashboard hierarchy (Attention Required → Today's
  Summary → Quick Actions → Recent Activity → Helpful Insights) — this
  order is a product decision from the PRD, not a layout preference.
- The receipt-review state model (ready / attention / new / unreadable)
  and its plain-language vocabulary — do not reintroduce OCR/AI
  terminology or confidence scores anywhere the owner can see them.
- The prohibited-vocabulary list in `DESIGN_SYSTEM.md` §7.
- The bottom-nav-on-mobile / sidebar-on-desktop navigation pattern.

## 11. How to compare your implementation against the prototype

1. Open the matching `.html` file in this repo and your implementation's
   equivalent screen side-by-side at each of the five required widths.
2. Run the Visual QA checklist (§8) against both.
3. For interaction parity, re-read the relevant section of
   `INTERACTION_SPECIFICATION.md` and manually walk through it against
   your build — most of these are stateful flows (Receipt Review, Record
   Sale) that a static screenshot comparison won't catch.
4. Diff copy against the prototype's rendered text (both English and
   Filipino, where `data-en`/`data-fil` pairs exist) — do not paraphrase
   microcopy during implementation.

## 12. Known prototype limitations (do not silently "fix" — reimplement properly)

- **Theme and language preference reset on full page navigation.** This
  static prototype is 14 separate HTML files with no shared JS runtime
  between page loads, and browser storage APIs were intentionally not used
  here. In production, persist both preferences server-side (or in your
  app's real client-side state/storage layer) so they survive navigation.
- **`product-details.html` and `receipt-review.html` show one hardcoded
  example each**, not a templated view — see §2.
- **Receipt "Add as new product" / "Choose a product" actions are visual
  only** — see `INTERACTION_SPECIFICATION.md` §6.
- Modal/drawer focus trapping is implemented; preserve it in production.
- Reports' time-range control (This week / This month) is not wired to
  actually swap the underlying numbers.

## 13. PRD v2.2 barcode prototype extension

The static prototype now demonstrates the approved barcode workflows without
changing the application shell or visual system:

- `record-sale.html` accepts camera, manual, and focused keyboard-style scanner
  input. Manufacturer and Tindahan-generated codes use one resolution path.
- Unknown codes remain non-mutating until the owner explicitly links an active
  product or creates a short new-product record.
- Sale lines above available stock are named, show requested and available
  quantities, and block confirmation until reduced or removed.
- `product-details.html` generates, previews, downloads, prints, reprints, and
  deliberately replaces an internal barcode while preserving product history.
- Inventory product creation progressively reveals manufacturer/generated/no
  barcode choices. `Other` remains a staged raw unit value.
- Inventory and global search match both barcode types.

PRD conflict resolved: the former prototype allowed an owner to confirm an
over-stock sale after a warning. PRD v2.2 requires non-negative inventory, so
confirmation is now disabled until every stock conflict is resolved.

Deterministic demo codes: `4800016640017` (manufacturer, Pancit Canton),
`2800000000068` (Tindahan, Fresh Eggs), `4800024571501` and
`2800000000075` (both, Corned Beef), `4800092555004` (low-stock Bottled
Water), and `8999999999999` (unknown).

Prototype-only limits: camera scanning uses a permission-aware simulated
recognition result; generated uniqueness is deterministic and store-scoped only
within the in-memory sample; sale and barcode changes reset after page reload.
Use `?sale-fail=1` and `?barcode-fail=1` to demonstrate preserved-draft and
generation-retry states.
## 14. Inventory list/grid extension

Inventory keeps the original `.row-list` as the default and adds a compact
`.inventory-grid` presentation. `initInventoryFilters()` owns one query/filter
pipeline for both views and persists only the presentation preference under
`tindahan.inventoryView`. Product cards use `TINDAHAN_DATA.products`; the
preserved rows provide the approved list markup and recent-update flags.

QA state URLs: `inventory.html?inventory-state=empty`,
`inventory.html?inventory-state=loading`, and
`inventory.html?inventory-state=error`. These simulate server-backed states;
the prototype still has no real pagination, incremental loading, or product
routing by ID, so every product link opens the existing hardcoded details
example.
