# Tindahan — Interaction Specification

Exact behavior contracts for every interactive pattern in the prototype.
Where the static prototype simplifies something a live backend would need
to do differently, that's called out explicitly.

---

## 1. Navigation

- **Active state** is driven by `<body data-page="...">` matched against
  `[data-nav="..."]` on every sidebar and mobile-nav link, in
  `navigation.js`. This keeps active-state logic in one file instead of
  hand-marking "active" on 14 duplicated shell copies.
- **Sidebar collapse** (desktop): any `[data-sidebar-toggle]` flips
  `.is-collapsed` on `.app-shell`. Collapsing hides text labels, keeps
  icons + tooltips-via-`aria-label`. State is per-page (not persisted
  across navigation) — see §7 for why.
- **Back vs. hamburger (mobile topbar):** a page passes `back_href` when
  it's a sub-page of a primary destination (Product Detail, Record Sale,
  Receipt Upload/Review) — the topbar shows a back arrow instead of the
  hamburger menu. Primary destinations (Dashboard, Inventory, Sales,
  Receipts, Reports, Notifications, Search, Settings) always show the
  hamburger.
- **"/" shortcut:** jumps to Search from anywhere the topbar search field
  is visible, matching the `/` hint shown next to it. Ignored while a text
  field has focus.

## 2. Drawer (mobile menu)

- Opens via `[data-drawer-open="mobile-menu"]` (topbar hamburger), closes
  via the X button, clicking the scrim, or **Escape**.
- Contains the four destinations not on the 5-slot mobile bottom nav
  (Reports, Search, Notifications, Settings) plus Sign out.
- Background scroll is locked while open (`document.body.style.overflow =
  "hidden"`).

## 3. Modal

- Opens via `[data-modal-open="<id>"]`, closes via `[data-modal-close]`,
  scrim click, or Escape.
- Focus moves to the first focusable element inside on open.
- **Used for:** Add Product (a genuine short form), and the two success
  confirmations (Sale recorded, Receipt confirmed) — i.e., materially
  significant or destructive-adjacent moments, per the PRD's confirmation
  rule. Never used for simple navigation.
- **Production requirement (not yet implemented in the static prototype):**
  focus must be trapped inside the modal while open (Tab/Shift+Tab cycle
  within it) and returned to the triggering element on close.

## 4. Confirmations

Per the PRD ("confirmation only for destructive, irreversible, or
materially significant actions"), this prototype asks for confirmation in
exactly three places:

1. **Record a sale** — the "Confirm sale" button is disabled until at
   least one product line exists, and shows a success modal after.
2. **Confirm a receipt** — "Confirm and update inventory" is disabled
   until every line item has been resolved (see §6), because confirming
   changes real stock counts.
3. **Stock adjustment** (Product Detail) — a lightweight, non-modal
   confirmation (toast) since it's correctable and not destructive; a
   heavier modal would be a "reduce effort" violation for a routine
   correction.

Everything else (filtering, searching, opening a product, marking a
notification read) requires **no** confirmation, per Design Commandment
#10 ("every interaction should reduce effort or increase confidence").

## 5. Form validation

- Errors render inline via `.field-error`, directly under the offending
  field — never as a toast or alert dialog, and never only as a red
  border (the message is always plain text).
- Required context (units, currency, examples) is shown as a
  `.field-hint` **before** submission, not only after an error — "forms
  that explain requirements before submission," per the PRD.
- This prototype has no server, so submission handlers are simulated
  (`onsubmit` calls a toast/close and does not persist data). Client-side
  `required` attributes are present where relevant (e.g. product name).

## 6. Receipt review interaction (hero workflow)

This is the most detailed interaction in the app and deserves its own
walkthrough. Source: `initReceiptReview()` in `interactions.js`.

1. On load, every line item is in one of four states: `ready`,
   `attention`, `new`, or `unreadable`. Ready items need no action.
2. The progress band ("X of Y items ready") and its progress bar update
   live as items are resolved.
3. Each non-ready line offers 1–2 actions:
   - **attention** → "Yes, same product" (resolves as matched) or "Add as
     new"/"Choose a product" (context-dependent).
   - **new** → "Add as new product" or "Skip."
   - **unreadable** → "Enter manually" or "Skip this item."
4. Any of these actions transitions the line to a resolved visual state
   (checkmark, muted styling, action buttons hidden) and decrements the
   pending count.
5. **"Confirm and update inventory" stays disabled until pending = 0.**
   This is a hard rule, not a suggestion — the owner cannot accidentally
   confirm a receipt with unresolved items.
6. Confirming opens a success modal and (in production) is the only
   moment inventory actually changes — matching the PRD's "Inventory
   updates only after confirmation."
7. **No confidence percentage is ever rendered.** States communicate
   themselves through icon + color + a plain-language line, never a number.

**Simplification vs. production:** "Add as new product" and "Choose a
product" do not open a real product-creation/search flow in this static
prototype — they resolve the line visually to demonstrate the state
machine. The live application connects these actions to the Add Product
flow and product search respectively.

## 7. Inventory adjustment interaction

On Product Detail, "Update stock" is a stepper + a required "reason"
select (Received new stock / Correction / Damaged or expired) — the
reason is captured so inventory history stays meaningful, without asking
the owner to write anything. Saving shows a toast, not a modal — it's a
routine, reversible action.

## 8. Sales interaction

`initRecordSale()` in `interactions.js`:

- Product picker defaults to the 10 most frequent products; typing re-filters
  the full catalog by name or barcode.
- Clicking a picker row adds it to the current sale, or increments
  quantity by 1 if already present.
- Each line has a stepper and number input. A requested quantity above stock is
  kept visible, names the product, shows requested and available values, and
  disables confirmation until reduced or removed.
- Removing the last line returns the summary to its empty state and
  disables "Confirm sale."
- "Confirm sale" opens a success modal offering "Record another sale"
  (resets the page) or "Go to Sales."

## 9. Animation timing

All transitions use the two tokens from `DESIGN_SYSTEM.md` §3
(150ms / 240ms, `cubic-bezier(0.16, 1, 0.3, 1)`) and animate only opacity,
transform, background-color, border-color, or width/height of a
purpose-built indicator (progress bar, stepper max state). Nothing
animates on page load. `prefers-reduced-motion: reduce` collapses every
duration to 1ms app-wide — no exceptions, no per-component opt-out needed.

## 10. Keyboard behavior

- Full tab order follows visual/DOM order on every screen (no `tabindex`
  overrides).
- `:focus-visible` renders a 2px brand-colored outline, never removed via
  `outline: none` without replacement (see `base.css`).
- Escape closes any open modal or drawer.
- Enter submits the focused form.
- Stepper buttons, chips, tabs, and accordion toggles are all real
  `<button>` elements — they receive focus and respond to Enter/Space
  natively, with no custom key handling required.

## 11. Barcode-assisted sale

All barcode sources call one normalized resolver. Spaces and hyphens are
removed; valid input is 8–14 digits. A known active product is added to the
draft, or incremented when already present. A repeated read of the same code
inside the short cooldown is ignored with visible and live-region feedback;
later deliberate scans increment normally.

The camera modal attempts permission, stops the prototype media stream
immediately, and simulates a known result. Permission denial or an unavailable
camera reveals retry and manual entry. Unknown input never mutates product,
sale, or inventory state. Search/link requires product selection plus explicit
Link and add; creation prefills the scanned manufacturer code.

Requested quantity may be typed or stepped above stock so the conflict is
visible, but Confirm sale is disabled. Direct correction uses available stock
or removes an out-of-stock line. Inventory is changed only inside the simulated
successful confirmation; failure preserves every draft line.

## 12. Generated barcode lifecycle

Generate moves through none → generating → ready, with a failure/retry branch.
The system chooses the value; the owner never types it. Label template chips
change only presentation. Print/reprint do not require confirmation. Download
creates a local SVG label and reports success or a retryable failure.

Replace opens a concise destructive dialog. Confirmation retires the prior
active value, creates a new deterministic prototype value, leaves historical
records attached to the product, and adds a history entry.
## 13. Inventory list/grid presentation

- List is the first-use default and remains the unchanged detailed operational
  view. The last selection is restored from `localStorage`.
- Search and status chips create one matched product array. List visibility,
  grid markup, live result text, and the empty state derive from that same
  array. Switching presentation never clears query/filter state or reorders
  results.
- The selected view uses `aria-pressed` and a polite live announcement. Native
  buttons provide Tab and Enter/Space behavior.
- Each grid card is one Product Details link. Status is icon plus text,
  imagery is optional/decorative, and missing images use the inventory package
  fallback.
- Query-string demo states cover `loading`, `error`, and inventory-level
  `empty`; retry returns to normal results. No-match provides a direct reset.

## Production loading feedback

Route transitions use the branded Tindahan loading mark. Local actions keep the current page usable and show a small spinner beside a specific verb such as “Adding product,” “Updating inventory,” or “Recording sale.” Search results use a compact section state after the existing debounce; unrelated controls remain available. Buttons are disabled only for the operation they submit and keep a stable footprint while pending.

Loading is not treated as success or failure. Success continues through the established toast or confirmation pattern, while failures retain entered data and expose the existing retry or correction path.
