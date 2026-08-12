# Tindahan — Screen Specifications

Fourteen screens. Each entry covers purpose, the owner's goal, information
hierarchy, primary/secondary actions, component composition, responsive
behavior, and the states implemented in the prototype.

---

## index.html — Sign in

- **Purpose:** Entry point into the app for a returning owner.
- **Owner's goal:** "Let me back into my store."
- **Hierarchy:** Brand mark → welcome message → sign-in form → alternate
  path (set up a new store).
- **Primary action:** Sign in.
- **Secondary action:** Set up a new store → `onboarding.html`.
- **Composition:** `.standalone-panel` split view — brand/value-prop panel
  (hidden ≤1180px) + form panel. Language toggle available pre-login.
- **Responsive:** Visual panel drops out below ~1180px; form becomes a
  full-width single column.
- **States:** Default, focus (inputs), disabled submit while empty
  (not enforced in this prototype — visual only), success → routes to
  `dashboard.html`.

## onboarding.html — Set up your store

- **Purpose:** First-run setup; establishes store identity and a couple of
  preferences before first use.
- **Owner's goal:** "Get this ready for my store, quickly."
- **Hierarchy:** 3-step wizard — Store details → Preferences → Ready, with
  a persistent step indicator.
- **Primary action:** Continue (steps 1–2) / Go to my dashboard (step 3).
- **Secondary action:** Back.
- **Composition:** Single centered card, `.step-indicator`, form fields,
  `.switch` toggles, closing checklist of first tasks.
- **Responsive:** Card scales to `max-width: 420px`, full-bleed padding on
  mobile.
- **States:** Step transitions (JS show/hide, no page reloads), completed
  step indicator dots.

## dashboard.html — Dashboard

- **Purpose:** "How is my store doing right now, and what needs my
  attention?" — the daily starting point.
- **Owner's goal:** Understand the day and act on what's urgent, in under
  five seconds.
- **Hierarchy (fixed, per PRD):** Attention Required → Today's Summary →
  Quick Actions → Recent Activity → Helpful Insights.
- **Primary action:** Contextual — each Attention item carries its own next
  step (Restock / Review inventory / Review receipt).
- **Secondary actions:** Quick Actions (Scan receipt, Record sale, Add
  inventory, Find product); links out to Reports and Sales.
- **Composition:** `.card-tint-cream` attention list, one summary `.card`
  with three tabular stats, `.card-tint-brand` quick-action grid, plain
  `.row-list` activity feed, two `.card-tint-olive` insight cards.
- **Responsive:** Quick-action grid 4→2 columns at tablet/mobile; all
  sections remain single-column stacked (this screen was never
  multi-column at the section level, by design — see
  `RESPONSIVE_BEHAVIOR.md`).
- **States:** Time-of-day greeting (JS, via `data-greeting`); empty
  Attention state is not shown by default (there is always at least one
  item in this data set) but the `.empty-state` component is defined for
  it in `components.css`.

## inventory.html — Inventory

- **Purpose:** Find a product, see status at a glance, act on it safely.
- **Owner's goal:** "Do I have this? How much? What's almost out?"
- **Hierarchy:** Header + Add product → filter chips (All / Low Stock /
  Out of Stock / Recently Updated) → search → result count → product list.
- **Primary action:** Add product (modal).
- **Secondary actions:** Filter, search, open a product.
- **Composition:** `.chip-row` filters, `.input-group` search,
  `.row-list` of `.row-item` links, `.modal` for Add product.
- **Responsive:** List stays single-column at all sizes (already scannable
  on mobile); filter chips wrap.
- **States:** Live filter/search (JS), empty state ("No products match"),
  loading is not simulated here (data is static) but the `.skeleton`
  component is available for a live implementation's first paint.

## product-details.html — Product detail (Fresh Eggs, Medium)

- **Purpose:** Progressive detail on one product + a safe way to correct
  its quantity.
- **Owner's goal:** "Fix the count, and see why it changed."
- **Hierarchy:** Identity (name, status) → Update stock (primary,
  highlighted) → tabs (Recent sales / Related receipts / History) →
  overview facts sidebar.
- **Primary action:** Save (stock update).
- **Secondary actions:** Edit product details; tab navigation.
- **Composition:** `.stepper` + reason `.select`, `.tabs`/`.tab-panel`,
  overview `<dl>`.
- **Responsive:** Two-column (`dash-grid`) → single column ≤1180px.
- **States:** Out-of-stock badge (danger), stock-update success (toast).

## sales.html — Sales

- **Purpose:** A record of what's been sold. **Not** a checkout/POS.
- **Owner's goal:** "What did I sell today?"
- **Hierarchy:** Today's totals (one card, three numbers) → time-range
  segmented control → expandable sale history.
- **Primary action:** Record sale → `record-sale.html`.
- **Secondary action:** Expand a sale row to see its line items.
- **Composition:** `.sale-row` accordion rows (native-feeling
  expand/collapse via `data-accordion-toggle`).
- **Responsive:** Rows remain single-column; header actions stack on very
  small screens.
- **States:** Collapsed/expanded row state.

## record-sale.html — Record a sale

- **Purpose:** The actual "record what happened" workflow.
- **Owner's goal:** Get a sale logged in a few taps and get back to the
  counter.
- **Hierarchy (per PRD):** Find/choose products → set quantities → review
  summary → confirm → success.
- **Primary action:** Confirm sale (disabled until at least one item is added
  and every insufficient-stock conflict is resolved).
- **Secondary actions:** Search products, remove a line, adjust quantity.
- **Composition:** Left: search + frequent-products picker
  (`data-sale-picker`, JS-rendered from `mock-data.js`). Right: sticky
  summary card with live line items, running total, and an insufficient
  -stock warning banner that appears only when a quantity exceeds stock on
  hand.
- **Responsive:** Two-column → single column (picker above summary)
  ≤1180px; summary card loses `position: sticky` on mobile.
- **States:** Empty picker result, empty sale, scan ready/scanning/found/unknown/
  camera unavailable/invalid/duplicate-read, recover-by-link/create, blocked
  insufficient-stock draft, confirmation progress/failure, and success modal.

## receipts.html — Receipts

- **Purpose:** Entry list for the receipts workflow — what needs review,
  what's confirmed.
- **Owner's goal:** "Do I have anything waiting on me?"
- **Hierarchy:** Scan receipt (primary) → filter chips → action-needed
  rows first → confirmed (expandable) rows.
- **Primary action:** Scan receipt → `receipt-upload.html`.
- **Secondary action:** Review a specific receipt; expand a confirmed
  receipt to see what it added.
- **Composition:** `.sale-row` pattern reused for confirmed receipts
  (accordion); plain link rows for anything needing action.
- **Responsive:** Single column at all sizes.
- **States:** Ready-to-review, needs-attention (partially unreadable),
  confirmed (expandable, read-only).

## receipt-upload.html — Scan a receipt

- **Purpose:** Capture a receipt with minimum friction.
- **Owner's goal:** "Get this receipt into the system without typing
  anything."
- **Hierarchy:** Instruction line → dropzone (drag/take photo/upload) →
  photo-quality tips.
- **Primary action:** Take photo / Upload file.
- **Composition:** `.dropzone` with three mutually-exclusive visual states
  (idle, loading, done) driven by `initDropzone()` in `interactions.js`.
- **Responsive:** Dropzone remains centered, `max-width: 560px` at all
  sizes; button pair stacks only if space is extremely tight.
- **States:** Idle → Preparing your receipt… (loading, spinner) → Ready to
  review (success, links to `receipt-review.html`). No error/retry state is
  wired in this static prototype; see `INTERACTION_SPECIFICATION.md` for
  the required production behavior.

## receipt-review.html — Review this receipt *(hero workflow)*

- **Purpose:** Make AI-assisted receipt processing understandable without
  ever exposing AI mechanics.
- **Owner's goal:** "Check what changed, fix anything wrong, confirm."
- **Hierarchy:** Progress band (X of Y items ready) → receipt photo
  (sticky, left) → grouped review lines (Recognized → Check these items →
  New products → Couldn't read) → confirm band.
- **Primary action:** Confirm and update inventory — **disabled until
  every item is resolved** (this is enforced, not just visual).
- **Secondary actions:** Per-line: confirm match / add as new / enter
  manually / skip.
- **Composition:** `.receipt-split` two-column grid, `.review-line` in
  four state variants, `.review-summary-band` with a live progress bar.
- **Responsive:** Splits to a single column ≤1180px; photo panel loses its
  sticky position and sits above the review list.
- **States:** `state-ready` (no action needed), `state-attention`
  (ambiguous match), `state-new` (not yet in inventory), `state-unreadable`
  (OCR failure) — each with distinct icon, color, and available actions.
  **No confidence percentage is ever shown**, per the PRD.

## reports.html — Reports

- **Purpose:** Answer four practical questions. Not a BI dashboard.
- **Owner's goal:** "What sold, what's low, what changed, what's stuck?"
- **Hierarchy:** Four equal-weight cards, each answering exactly one
  question, 2×2 grid.
- **Primary action:** None — this is a read-only screen by design.
- **Composition:** Lightweight CSS bar-list (no chart library) for top
  sellers; plain `.row-list` for the rest; two-line delta summary for
  inventory change.
- **Responsive:** 2×2 → single column ≤1180px.
- **States:** Time-range segmented control (This week / This month) is
  visual in this prototype; the live application connects the control to
  the corresponding report range.

## notifications.html — Notifications

- **Purpose:** A single place to catch up on what happened.
- **Owner's goal:** "What did I miss?"
- **Hierarchy:** Unread count + Mark all as read → chronological list.
- **Primary action:** Mark all as read.
- **Secondary action:** Tap a notification to mark it read.
- **Composition:** `.notif-list-card` containing `.notif-item` rows with a
  color-coded icon (not color alone — each also has a distinct icon and a
  written status) and an unread dot.
- **Responsive:** Single column at all sizes.
- **States:** Unread (cream background + dot) / read.

## search.html — Search

- **Purpose:** Find any product fast, from anywhere in the app (topbar
  shortcut on desktop/tablet, dedicated tab on mobile).
- **Owner's goal:** "Where is this one product?"
- **Hierarchy:** Large search field (autofocused) → category quick-filters
  → live results.
- **Primary action:** None — selecting a result is the action.
- **Composition:** `.input-group` (large), `.chip-row` category shortcuts,
  live-filtered `.row-list` from `mock-data.js`.
- **Responsive:** Single column at all sizes; this screen **is** the
  mobile primary-nav search destination.
- **States:** Empty (no query yet — chips shown, no results shown), has
  results, no results found.

## settings.html — Settings

- **Purpose:** A deliberately small set of preferences.
- **Owner's goal:** "Change my store info / language / notifications."
- **Hierarchy:** Store information → Account → Preferences → Notifications
  → Support, each in its own labeled group.
- **Primary action:** None global — each row is its own small action
  (edit, toggle, change password).
- **Composition:** `.settings-group` + contained `.card` of `.row-item`
  rows; `.switch` toggles; `.segmented` language control.
- **Responsive:** Single column at all sizes.
- **States:** Toggle on/off, theme toggle synced with the global theme
  state used everywhere else in the app.

---

**Explicitly out of scope for both this prototype and, per the PRD, the
product itself:** OCR provider selection, AI parameters, sync/queue status,
database configuration, system logs, and any developer-facing controls.
None of the 14 screens above expose any of these.

## PRD v2.2 barcode extensions

### record-sale.html

- Adds a quiet secondary barcode card above frequent products; Confirm sale
  remains the only primary action.
- Camera modal states: ready, scanning, found, unknown, unavailable/permission
  denied, invalid manual entry, duplicate-read cooldown, link search, and short
  product creation.
- Focused scanner input submits on Enter and never captures ordinary page
  keystrokes.
- Scans update only the draft. Confirmation simulates one atomic stock change;
  `?sale-fail=1` preserves the draft and offers retry.
- Every insufficient line shows product, available stock, requested quantity,
  and a direct reduce/remove action. Confirmation stays disabled while invalid.

### inventory.html

- Existing list search metadata includes manufacturer and internal barcodes.
- Add Product progressively reveals manufacturer, generated, or no-barcode
  choices.
- `Other` captures the owner's wording as a temporary staged unit.

### product-details.html

- Adds a barcode card after Update stock. States cover none, generating,
  generated, failure/retry, label selection, and replacement.
- Compact, standard, and price-label options reuse chips and cards.
- Print hides the application shell. SVG download is generated locally.
- Replacement requires a warning dialog and adds a visible history entry.

### search.html

- Matches partial product name, category, supplier, manufacturer barcode, and
  Tindahan barcode. Barcode values appear as result metadata only for numeric
  barcode searches.
## Inventory list/grid extension (inventory.html)

- The approved vertical `.row-list` remains the default detailed operational
  view. A compact `.segmented.view-toggle` adds an alternative
  `.inventory-grid` without changing the page's primary Add product action.
- Search and status chips feed the same result set, ordering, count, and empty
  logic in both presentations. The selected view persists in `localStorage`.
- Grid density is 4 columns at wide desktop, 3 at laptop, 2 at tablet, and 1
  at 390px. Every card is one Product Details link and shows only product
  identity, category, status, quantity/unit, price, and optional recent/barcode
  indicators.
- Static state URLs: `?inventory-state=empty`, `loading`, or `error`. The
  normal no-match state offers a reset; inventory-empty offers Add product;
  unavailable offers retry.
