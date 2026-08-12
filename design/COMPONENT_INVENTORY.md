# Tindahan — Component Inventory

Every reusable component in `css/components.css`, what it's for, and how
not to misuse it. Class names are exact and match the CSS/HTML in this
repo.

---

### Button — `.btn`
**Purpose:** Every clickable action in the app.
**Variants:** `.btn-primary` `.btn-secondary` `.btn-soft` `.btn-ghost`
`.btn-danger` `.btn-accent`. Sizes: `.btn-sm` `.btn-lg` (default is the
base size). `.btn-block` for full-width. `.btn-icon` for icon-only
(square, 44×44).
**States:** default, hover, `:active` (1px press), `:disabled`,
`.btn-loading` (spinner replaces label, label kept for screen readers via
`color: transparent` — text stays in the DOM).
**Accessibility:** 44px minimum height on every size. Icon-only buttons
**must** carry `aria-label`.
**Misuse to avoid:** Never more than one `.btn-primary` visible at a time
on a screen. Never an icon-only primary action without a label.

### Input / Select / Textarea — `.input` `.select` `.textarea`
**Purpose:** Form fields, always paired with `.field` + `.field-label`.
**States:** default, hover, focus (`--shadow-focus` ring, never removed),
`.has-error`, `:disabled`.
**Accessibility:** Always associated to a `<label for>`. Error state pairs
with `.field-error` text directly below the field (inline, not a toast) —
"inline validation close to the relevant field" per the PRD.
**Misuse to avoid:** Never rely on placeholder text as a label substitute.

### Stepper — `.stepper`
**Purpose:** Quantity input (sales lines, stock adjustment). Two buttons +
a numeric input.
**Behavior:** `data-max` on the inner `<input>` clamps the ceiling (stock
on hand); reaching it adds `.stepper-at-max`. Fires a `stepper:change`
custom event other components can listen for (used by Record Sale to
recompute totals).
**Accessibility:** Both buttons carry `aria-label`; the input carries a
specific `aria-label` naming the product.

### Badge — `.badge`
**Purpose:** A short status word, always icon + text — **never color
alone**.
**Variants:** `-success` `-warning` `-danger` `-info` `-neutral` `-olive`.
**Misuse to avoid:** Never a bare color dot as a status indicator; always
pair with a word (see `notif-dot`, which is a *supplementary* indicator
next to a fully-worded row, not the only signal).

### Card — `.card`
**Purpose:** The base surface for every grouped piece of content.
**Variants:** `.card-tint-cream` (Attention Required), `.card-tint-brand`
(emerald, Quick Actions), `.card-tint-olive` (Insights), `.card-link`
(hoverable/clickable card).
**Rule:** One card = one question. If a card needs a second heading, it
should be two cards.

### Attention item — `.attn-item` / `.attn-icon`
**Purpose:** A single actionable alert row on the Dashboard.
**Anatomy:** icon (in a tinted 40×40 square) + title + meta + a single
action button.
**Tones:** `.warning` `.danger` `.info`.

### Quick action tile — `.quick-action`
**Purpose:** One-tap entry into a hero workflow from the Dashboard.
**Anatomy:** icon in a soft-emerald square + label. Always a link, never a
button that opens a nested menu.

### Chip / filter — `.chip`, `.chip-row`
**Purpose:** Single-select-style filters (Inventory status, Receipts
status, Search categories).
**States:** default, hover, `.active`.
**Misuse to avoid:** Don't use chips for multi-select unless the visual
design changes to communicate that (checkmarks, not just active fill).

### Segmented control — `.segmented`
**Purpose:** A small, closed set of mutually exclusive options (time
range, language, theme-in-settings).
**Difference from chips:** Chips filter a list and can imply counts;
segmented controls switch a view/mode.

### Row item — `.row-item`, `.row-list`
**Purpose:** The default list-row pattern used everywhere data is listed
(inventory, search results, activity feed, receipts). Deliberately **not**
a data table — see Design Commandment against dense grids.
**Anatomy:** optional leading icon/thumb, title + meta (`.row-main`), an
optional badge, an optional trailing value.
**Accessibility:** When the whole row is a link, the link wraps the full
row (min. 44px height) rather than using a separate small "view" link.

### Sale / receipt row (accordion) — `.sale-row`
**Purpose:** A row that expands in place to show line-item detail, used
on Sales and Receipts, instead of navigating to a separate detail page for
read-only history.
**Behavior:** `data-accordion-toggle` / `data-accordion-panel` (generic,
see `interactions.js`); chevron rotates 180° on open.

### Empty state — `.empty-state`
**Purpose:** Any list/result with zero items. Always: an icon, a plain
-language headline, and — where relevant — one actionable next step.
**Misuse to avoid:** Never a bare "No data" string. Never a decorative
illustration/mascot (explicitly prohibited by the brief).

### Skeleton — `.skeleton`, `.skeleton-line`, `.skeleton-title`
**Purpose:** First-paint loading placeholder for any async content. Not
actively triggered in this static prototype (data is inline), but the
component is complete and available for live data-loading states.

### Toast — `.toast`, `.toast-region`
**Purpose:** Brief, non-blocking confirmation of a background action
("Product added," "Inventory updated").
**Behavior:** Auto-dismisses after 5s or on manual close; `role="status"
aria-live="polite"` on the region so screen readers announce it without
interrupting.
**Misuse to avoid:** Never use a toast for anything the owner must act on
— that belongs in a banner or a confirmation dialog instead.

### Modal — `.modal`, `.overlay-scrim`
**Purpose:** Focused, blocking tasks — Add Product, and the two success
confirmations (sale recorded, receipt confirmed).
**Behavior:** Opens via `[data-modal-open="id"]`, closes via
`[data-modal-close]`, click-outside, or **Escape**. Focus moves to the
first focusable element on open.
**Accessibility:** focus is trapped inside the open modal and restored to the
trigger on close.

### Drawer — `.drawer`
**Purpose:** Mobile-only secondary navigation (Reports, Settings, Search,
Notifications, Sign out) reached via the topbar hamburger.
**Behavior:** Slides in from the right; same open/close/Escape pattern as
the modal.

### Tabs — `.tabs`, `[data-tab-panel]`
**Purpose:** Switching between related views without changing screens
(Product Detail: Recent sales / Related receipts / History).
**Behavior:** `data-tabs-group` links a `.tabs` bar to its panels so
multiple independent tab groups can exist on one page without collision.

### Progress bar — `.progress-track` / `.progress-fill`
**Purpose:** The Receipt Review "X of Y items ready" indicator. The only
"chart-like" element outside Reports, and it's a literal, direct answer to
one question — not decoration.

### Banner — `.banner`
**Purpose:** A persistent, in-context message tied to the content around
it (insufficient stock warning on Record Sale, photo-quality tip on
Receipt Upload).
**Tones:** `-warning` `-danger` `-info` `-offline`.
**Difference from toast:** Banners stay until the underlying condition
changes; toasts disappear on their own.

### Dropzone — `.dropzone`
**Purpose:** Receipt capture (drag, take photo, upload).
**States:** idle, `.is-dragover`, loading (spinner + message), done
(success + CTA to review). See `receipt-upload.html` for the exact
three-state markup pattern.

### Review line — `.review-line`
**Purpose:** One line item inside Receipt Review.
**States (mutually exclusive):** `.state-ready` `.state-attention`
`.state-new` `.state-unreadable` — each with its own icon, tint, and
available actions. This is the component most directly responsible for
making AI-assisted processing feel understandable; see
`INTERACTION_SPECIFICATION.md` for its full behavior contract.

### Notification item — `.notif-item`, `.notif-dot`
**Purpose:** One entry in the Notifications list.
**States:** `.is-unread` (cream background + filled dot) / read (dot
becomes `.is-read`, transparent).

### Brand mark — `.brand-mark`, `.brand-glyph`, `.brand-word`
**Purpose:** The Tindahan logo lockup, used in the sidebar header, the
sign-in panel, onboarding, and the mobile drawer. Source asset:
`assets/images/tindahan-logo.svg`.

### Switch — `.switch`
**Purpose:** Binary on/off preferences (Settings, onboarding).
**Accessibility:** The `<input type="checkbox">` inside always carries its
own `aria-label` — do not rely on the wrapping `<label>` alone, since it
has no text content (only decorative track/thumb spans).

### Stat display — `.stat-value`, `.stat-label`, `.stat-delta`
**Purpose:** A single number with context (Dashboard summary, Sales
totals). Always paired with a label; deltas always carry a directional
icon, not color alone.

### Step indicator — `.step-indicator`, `.step-dot`
**Purpose:** Progress through a short linear flow (Onboarding, sign-in
visual panel).

### Barcode entry card — `.barcode-entry-card`

**Purpose:** Secondary sales input combining the existing card, button, input
group, and plain-language guidance.
**States:** ready, focused scanner input, success, invalid input.
**Accessibility:** the scanner input is explicitly focused; no global
keystroke capture is used. Feedback is mirrored to a polite live region.
**Misuse to avoid:** Never style it as a second primary task or deduct stock.

### Scanner surface — `.scanner-surface`

**Purpose:** Calm camera guidance inside the existing modal primitive.
**States:** ready, scanning, found, unknown, unavailable/denied, cancelled.
**Accessibility:** manual entry is always available; the modal traps focus,
closes with Escape, and restores focus.
**Misuse to avoid:** No neon effects, confidence values, or camera jargon.

### Barcode choice — `.barcode-choice`

**Purpose:** Progressive Add Product choice for manufacturer, generated, or no
barcode identity.
**States:** default and selected; manufacturer selection reveals its input.
**Accessibility:** native radio inputs preserve keyboard and screen-reader
behavior.

### Barcode label preview — `.barcode-label-preview`

**Purpose:** Product label containing name, generated SVG bars, readable value,
optional price, and restrained branding.
**States:** compact, standard, price, preparing, ready, and retry.
**Accessibility:** the SVG has a translated accessible name; print/download
actions use visible labels.
### Inventory view toggle — `.view-toggle`

**Purpose:** Switches the Inventory result presentation without changing the
active query, filter, order, or result set. It extends `.segmented` and uses
44px minimum targets.
**States:** list/grid via `.active` plus `aria-pressed`; the chosen value is
stored under `tindahan.inventoryView`.
**Accessibility:** both buttons retain visible text and icons, localized
accessible names, native keyboard behavior, and a polite change announcement.

### Inventory product card — `.inventory-card`, `.inventory-grid`

**Purpose:** Compact alternative to the approved product row for browsing a
large inventory. The entire card is one Product Details link.
**Anatomy:** optional image or restrained package fallback, name, category,
status badge, quantity/unit, price, and optional barcode/recent indicators.
**Rule:** cards and rows use the same `TINDAHAN_DATA.products` source and match
state. Do not add supplier/history/full codes or per-card menus.

## Production loading system

- `LoadingIcon` is the small Warm Utility spinner used beside specific status text.
- `InlineLoading` is used inside buttons, controls, and compact component regions; it never replaces the task label with an unlabeled spinner.
- `SectionLoading` centers the same icon-and-message pair inside an existing content region without adding an unnecessary card.
- `TindahanRouteLoading` is reserved for route transitions and initial app loading. It uses the Tindahan store mark with the localized label “Loading Tindahan.”
- `TindahanLogoLoader` preserves the approved three-path storefront geometry and reveals each stroke in sequence. The completed mark holds before a soft loop reset; it never rotates, scales, glows, or adopts reference-art colors.
- `LoadingIcon` rotates clockwise at a consistent 0.8-second linear cadence while its operation remains pending.
- Pending controls retain their normal dimensions, expose `aria-busy`, prevent duplicate activation, and use context-specific EN/FIL messages.
- The prototype skeleton and `.btn-loading` rules remain immutable reference artifacts. Production code does not use them.
