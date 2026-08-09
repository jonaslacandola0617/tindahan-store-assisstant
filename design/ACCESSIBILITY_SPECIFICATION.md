# Tindahan — Accessibility Specification

Written for tired, distracted, older, and low-literacy users, per the PRD.
This document covers what's implemented, how it was verified, and what
remains for Codex to finish in a production build.

---

## 1. Color contrast (WCAG 2.1 AA)

Every color pair in `tokens.css` was measured against the WCAG relative
-luminance formula (4.5:1 for normal text, 3:1 for large text / UI
component boundaries / graphical objects). Two pairs in the original
visual-identity spec failed measurement and were adjusted; see
`DESIGN_SYSTEM.md` §6 for the full explanation. Summary of the fixes:

| Token | Before | After | Reason |
|---|---|---|---|
| `--color-border-strong` (light) | `#D8D2C8` (1.5:1) | `#9C917D` (3.0–3.1:1) | Input/control borders must hit 3:1 non-text contrast |
| `--color-border-strong` (dark) | `#363D37` (1.5:1) | `#63715F` (3.3:1) | Same, dark mode |
| `--color-warning-text` (new token) | n/a | `#8A4A16` (6.4:1 on warning-soft) | Warning badges/icons/attention-state text were 2.96:1 as originally specified |
| `--color-accent-strong` (new token, `.btn-accent` only) | n/a | `#AD5811` / `#A85E0E` (dark) | White button text on raw accent was 3.17:1, under the 4.5:1 text minimum |

All other pairs (body text, muted text, success/danger/info badges, dark
mode equivalents) measured above 4.5:1 and needed no change. The
measurement script is reproducible — see the note at the end of this file.

**No status is ever communicated by color alone.** Every badge pairs an
icon + a word; every unread notification has both a filled dot *and* a
distinct background tint *and* different (unread) copy treatment — any one
of the three would be enough on its own.

## 2. Focus

- `:focus-visible` renders a 2px solid outline in the brand color with
  2px offset, defined once in `base.css`, and is **never** suppressed
  anywhere in the codebase (`grep -r "outline: none" css/` returns only
  the paired `:focus` reset that `:focus-visible` immediately restores).
- Tab order matches visual/reading order on every screen — no `tabindex`
  overrides exist in the codebase.
- Modal and drawer focus is trapped. Tab/Shift+Tab cycle within the active
  overlay, Escape closes it where safe, and focus returns to the triggering
  control.

## 3. Labels & semantic structure

- Every form field uses a real `<label for>` bound to its input's `id`.
- Every icon-only control (`.btn-icon`, sidebar collapse, theme toggle,
  modal close, mobile menu/back buttons) carries `aria-label`. Verified
  programmatically across all 14 pages — zero icon-only controls without
  one.
- Every `<input type="checkbox">` inside a `.switch` carries its own
  `aria-label`, because the wrapping `<label>` has no text content (see
  `COMPONENT_INVENTORY.md` → Switch).
- Landmarks: `<aside class="sidebar">`, `<header class="topbar">`,
  `<main id="main">`, `<nav>` (sidebar, mobile nav, drawer) are real
  semantic elements, not generic `<div>`s with visual styling only.
- A `.skip-link` ("Skip to content") is the first focusable element on
  every shell page, jumping straight to `#main`.
- Modals carry `role="dialog" aria-modal="true"` and `aria-labelledby`
  pointing at their visible heading; the mobile drawer carries `role=
  "dialog" aria-modal="true" aria-label="Menu"`.
- Toasts render inside a `role="status" aria-live="polite"` region so
  confirmations are announced without interrupting the current task.

## 4. Color is never the only signal — worked examples

- **Low stock:** amber badge **and** the words "Low stock" **and** the
  icon changes shape (triangle, not a circle).
- **Out of stock:** red badge **and** the words "Out of stock" **and** an
  ✕-in-circle icon distinct from every other status icon.
- **Receipt review states:** each of the four states (ready / attention /
  new / unreadable) has a unique icon *and* unique available actions *and*
  unique copy — color is the last, reinforcing signal, never the first.

## 5. Reduced motion

`@media (prefers-reduced-motion: reduce)` is declared once in
`tokens.css` (collapses both transition-duration custom properties to
1ms) and reinforced in `base.css` with a blanket
`animation-duration/iteration-count/transition-duration` override. This
covers every animated component in the system without needing a
per-component reduced-motion variant.

## 6. Touch targets

Every interactive control is **at least 44×44px**, enforced directly in
the component CSS rather than left to chance:

- `.btn` (all sizes, including `.btn-sm`): minimum 44px height is only
  relaxed on `.btn-sm` for *desktop-only* dense contexts — confirm before
  reuse on a touch-primary screen.
- `.btn-icon`, stepper buttons, chip buttons, mobile-nav items, checkbox
  /switch hit areas: all 44×44 minimum.
- List rows (`.row-item`, `.notif-item`, `.sale-row-header`): 76px and 44
  px+ minimum heights respectively — comfortably exceed the touch minimum
  even before counting internal padding.

## 7. Forms

- Every field that has a non-obvious requirement shows a `.field-hint`
  **before** the person can submit (e.g. "Prototype only — any password
  works" on sign-in; unit/price context on Add Product).
- Errors, when shown, render as plain-language text immediately under the
  field (`.field-error`) — never a color-only red border, never a toast,
  never a generic "Form invalid" summary at the top of a long form.

## 8. Screen-reader-specific notes for Codex

- The icon sprite is inlined per-page and every `<symbol>` is inside a
  `display:none` parent `<svg>` — decorative and correctly invisible to
  assistive tech; individual `<use>` instances additionally carry
  `aria-hidden="true"` (set in `shell.py`'s `icon()` helper) since the
  adjacent text or `aria-label` is always the real accessible name.
- Live-updating regions that are announced to assistive tech: the toast
  region (`aria-live="polite"`) and the Receipt Review progress text
  (`data-review-progress`, also `aria-live="polite"`) — a screen-reader
  user resolving line items hears the "X of Y ready" count update without
  needing to re-navigate to it.

## 9. How contrast was measured (for reproducibility)

Standard WCAG relative luminance: `L = 0.2126·R + 0.7152·G + 0.0722·B`
(each channel linearized via the sRGB piecewise curve), contrast ratio
`(L1 + 0.05) / (L2 + 0.05)` with L1 ≥ L2. Every token pair listed in §1 was
computed this way, not eyeballed.

## 10. Barcode workflow additions

- Generic modals and the mobile drawer now trap Tab/Shift+Tab and restore focus
  to the opening control on close. Escape remains supported.
- Scan results, unknown codes, invalid codes, and duplicate-read cooldown
  messages are sent to a polite live region.
- The connected-scanner path uses a visible, focused input and Enter submit; it
  does not intercept ordinary keyboard navigation.
- Camera access is never the sole path. Manual entry and connected-scanner
  input remain available after denial or unavailability.
- Every barcode state uses icon plus plain-language text, never color alone.
- Label SVGs have accessible names; print, download, reprint, and replacement
  controls have visible text.
- New Filipino copy covers actions, guidance, errors, status, recovery, and
  destructive confirmation. Language changes preserve current draft, quantity,
  form, and barcode state.
## 11. Inventory view additions

- List/Grid are native buttons with localized visible labels, icons,
  `aria-pressed`, and 44px minimum targets inside a labelled group.
- A polite live region announces presentation changes; a separate live result
  message reports count changes from search and filtering.
- Grid reading and tab order follow source order. Each card is one link with a
  visible focus ring and no nested competing controls.
- Stock status is always icon plus English/Filipino text. Product thumbnails
  are decorative because the adjacent product name is the identity, so image
  `alt` is empty; missing imagery uses an `aria-hidden` package fallback.
- No-match, no-products, loading, and unavailable states include plain-language
  descriptions and one clear recovery action.

## Production loading states

- Visible pending messages are exposed with `role="status"`, polite live announcement, and `aria-busy="true"` on the affected region or control.
- Icon-only pending feedback is allowed only in constrained controls and includes a screen-reader-only localized label.
- The loading icon is decorative context for adjacent text; meaning never depends on motion alone.
- Both spinner rotation and branded-mark breathing stop under `prefers-reduced-motion: reduce`.
- Pending controls preserve the prototype focus, contrast, and 44px target contracts.
