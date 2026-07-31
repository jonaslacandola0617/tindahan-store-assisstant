# Tindahan — Responsive Behavior

Breakpoints and rules exactly as implemented in `css/responsive.css`.
Evaluated at the five required widths: 1440 / 1280 / 1024 / 768 / 390.

---

## Breakpoint map

| Range | Treated as | Sidebar | Primary layout |
|---|---|---|---|
| > 1360px | Desktop (1440) | Expanded (240px), user-collapsible | Full multi-column |
| 1180–1360px | Laptop (1280) | Same as desktop, tighter content padding | Full multi-column |
| 821–1180px | Tablet landscape (1024) | **Forced icon rail** (72px, labels hidden) | 2-column grids; `dash-grid` and `receipt-split` narrow |
| ≤820px | Tablet portrait (768) **and** Mobile (390) | **Hidden** — replaced by bottom nav + drawer | Single column throughout |

Tablet portrait and mobile share one implementation deliberately: at 768px
there isn't enough width for a sidebar *and* a usable content column, so
Tindahan uses the same mobile navigation pattern down to 390px rather than
an awkward in-between "shrunk desktop" layout. Desktop and tablet (both
orientations) still support the full workflow — they just reach it through
different navigation chrome, exactly as the PRD requires. Only the very
smallest breakpoint (≤400px) gets additional micro-adjustments (see below).

## Sidebar → icon rail → bottom nav

1. **Desktop/laptop:** full sidebar, user can collapse to a 72px icon rail
   via the collapse button; state is visual/session-only.
2. **Tablet landscape:** the icon rail is **forced** (not optional) —
   `.app-shell { grid-template-columns: var(--sidebar-width-collapsed) 1fr
   !important; }`. Labels are hidden; icons + `aria-label` remain the only
   affordance, consistent with limited horizontal space at this size.
3. **≤820px:** `.sidebar { display: none; }`. Navigation moves entirely to
   `.mobile-nav` (5 slots: Home, Stock, [Scan — center FAB], Sales, Alerts)
   plus a hamburger-triggered `.drawer` for Reports/Search/
   Notifications/Settings/Sign out. This matches the PRD's explicit mobile
   requirement: *"no miniature desktop sidebar."*

## Content grids

| Component | Desktop/laptop | Tablet landscape | ≤820px |
|---|---|---|---|
| `.dash-grid` (Product Detail, Record Sale) | 1.6fr / 1fr | 1fr (stacked) | 1fr (stacked) |
| `.grid-3` / `.grid-4` (stats, quick actions) | 3 / 4 columns | 2 columns | 1 column (quick actions stay 2-up) |
| `.receipt-split` | 360px / 1fr, photo sticky | 300px / 1fr, photo sticky | 1fr (stacked), photo **not** sticky |
| `.standalone-panel` (sign-in) | 2 columns | 1 column, visual panel hidden | same as tablet landscape |

## Topbar

- **Desktop/laptop/tablet landscape:** full search field (340px → 260px as
  space tightens), language segmented control, theme toggle, notification
  bell all visible inline.
- **≤820px:** search collapses to an icon-only button (still links to
  `search.html`); a hamburger button replaces the wordmark-adjacent space
  freed by the hidden sidebar; a back arrow replaces the hamburger on
  sub-pages (Product Detail, Record Sale, Receipt Upload/Review).

## Touch targets

Every interactive element is ≥44×44px at every breakpoint — this is a
fixed value in `components.css`/`layouts.css`, not something that shrinks
at smaller widths. Chips and stepper buttons keep a 40–44px minimum even
inside the tightest layouts.

## Content padding

`.content` padding steps down as space tightens: 32px (desktop) → 24px
(laptop) → 16px (mobile), with an added bottom safe-area (
`calc(var(--mobile-nav-height) + var(--space-8))`) on mobile so content
never sits under the fixed bottom nav.

## Modals & drawers

- Desktop/tablet: modal is a centered fixed-width panel (`min(480px,
  calc(100vw - 32px))`).
- Mobile: modal expands to `calc(100vw - 24px)` with reduced padding; the
  mobile drawer becomes full-width (`100vw`) with square corners instead
  of the desktop rounded-left edge.

## Micro-adjustments at ≤400px

`css/responsive.css`'s final block handles the smallest phones
specifically: header action rows stack vertically instead of staying
inline, card padding drops from 24px to 16px, and the two largest type
sizes (`h1`, `.stat-value`) step down one scale notch so headlines don't
wrap awkwardly on a 390px viewport.

## Barcode extensions

- The sales barcode card follows the existing two-column sale layout and stacks
  with it at ≤1180px.
- Scanner and replacement dialogs use the existing modal breakpoint behavior.
- Barcode choices collapse from three columns to one at ≤820px.
- Label preview expands to available card width on mobile and never overflows.
- Scanner/manual input rows remain horizontal through tablet portrait and stack
  at ≤400px; their buttons remain at least 44px high.
- Print media hides the complete application shell and exposes only the active
  label preview.
## Inventory view extension

- The approved list remains a single column at every width.
- The grid uses `minmax(0, 1fr)` tracks to prevent long product names from
  forcing horizontal overflow: 4 / 3 / 2 / 2 / 1 columns at the required
  1440 / 1280 / 1024 / 768 / 390 widths.
- At 820px and below the result bar wraps when needed. At 400px and below the
  segmented toggle spans the content width and both 44px targets share the row.
- Cards allow names to wrap and use the existing bottom-navigation safe area.
