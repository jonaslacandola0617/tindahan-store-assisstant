# Tindahan — Design System

Warm Utility, implemented. This document is the practical reference for every
token, rule, and constraint used to build the prototype in this repository.
It complements — and never contradicts — the source specification:
*Official Visual Identity & Design Specification v1.0*.

---

## 1. Product experience principles

These five principles governed every screen-level decision in this prototype:

1. **Recognition, not recall.** Labels mirror the owner's own words ("I
   received products," "This is almost out"), never system or database
   language. See §7 for the full prohibited-vocabulary list.
2. **One glance, one purpose.** Every screen and every card answers exactly
   one question, with a single unmistakable primary action.
3. **Progressive disclosure.** Detail (history, supplier info, line items)
   is always available but never front-loaded. Default views stay calm.
4. **Confidence through visible state.** Loading, success, error, and
   "needs attention" are always explicit and in plain language — never
   silent, never ambiguous.
5. **Attention before performance.** What needs the owner's action today
   always outranks analytics or historical data in visual hierarchy.

## 2. Visual language

Tindahan draws from Apple (tactile clarity, material discipline), Linear
(speed, spatial efficiency), and Notion (calm typography, modular
flexibility) — without imitating any of them. The result should read as a
**recognizable consumer product adapted for running a store**, not
enterprise software made smaller.

## 3. Design tokens

All prototype tokens live in `design/static-prototype/css/tokens.css` and must never be hardcoded elsewhere.
`[data-theme="dark"]` on `<html>` swaps the entire palette; every other
token (spacing, radii, motion, type scale) is theme-independent.

### Color — light mode

| Token | Hex | Usage |
|---|---|---|
| `--color-brand-primary` | `#1B4D3E` | Primary CTAs, active nav, focal points |
| `--color-brand-soft` | `#E8F2EE` | Soft button/badge backgrounds, active nav pill |
| `--color-accent` | `#D97724` | Warm highlights, Receipts module identity |
| `--color-accent-strong` | `#AD5811` | Accent button backgrounds (white-text-safe) |
| `--color-canvas` | `#FAF8F5` | App background |
| `--color-surface` | `#FFFFFF` | Cards, modals, inputs |
| `--color-surface-cream` | `#FDFBF7` | Attention Required card surface |
| `--color-border` / `--color-border-strong` | `#E6E2DC` / `#9C917D` | Decorative dividers / interactive control boundaries |
| `--color-text-primary` | `#1A1D1A` | Headings, primary text |
| `--color-text-muted` | `#5F665E` | Secondary text, metadata |
| `--color-text-faint` | `#8A9089` | Tertiary/disabled text |
| `--color-olive-100/300/600` | `#EEF2E6` / `#C9D4BF` / `#6B7B52` | Inventory module identity |
| `--color-success/-soft` | `#1B4D3E` / `#E8F2EE` | Success state |
| `--color-warning` | `#D97724` | Warning fills, icons, large-scale UI |
| `--color-warning-text` | `#8A4A16` | Warning **text and small icons** on `-soft` backgrounds (accessible variant, see §6) |
| `--color-danger/-soft` | `#B3411F` / `#FBEAE3` | Danger state |
| `--color-info/-soft` | `#3E6B8F` / `#EAF1F6` | Informational state |

Dark mode remaps every token in `[data-theme="dark"]`; the semantic names
stay identical so components never need dark-mode-specific classes.

### Module color identity

| Module | Color | Tint token |
|---|---|---|
| Dashboard | Emerald | `--tint-dashboard` |
| Inventory | Olive | `--tint-inventory` |
| Receipts | Warm amber | `--tint-receipts` |
| Reports | Slate neutral | `--tint-reports` |
| Settings | Neutral | `--tint-settings` |

### Typography

- Family: `'Plus Jakarta Sans', 'DM Sans', system-ui, -apple-system, sans-serif`
  (loaded from Google Fonts in every page `<head>`; system-ui fallback keeps
  the app usable offline).
- Scale: `--text-xs` 12 · `--text-sm` 13 · `--text-base` 15 (body default) ·
  `--text-md` 16 · `--text-lg` 18 · `--text-xl` 22 · `--text-2xl` 28 ·
  `--text-3xl` 34.
- Headings: weight 600, `letter-spacing: -0.02em`.
- Body: weight 400, `line-height: 1.6`.
- Numbers (prices, quantities, totals) use `font-variant-numeric:
  tabular-nums` via the `.tabular-nums` utility so columns of figures align.

### Spacing scale (4px base)

`--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-7` 28 ·
`-8` 32 · `-10` 40 · `-12` 48 · `-16` 64. Section gaps use `--space-6` to
`--space-8`, matching the spec's "24–32px section gaps" rule.

### Radii

`--radius-sm` 8px (tags, small inputs, buttons) · `--radius-md` 14px
(inputs, dropdowns) · `--radius-lg` 20px (cards) · `--radius-xl` 28px
(modals, drawers).

### Elevation

`--shadow-card` (subtle, paper-like) for resting cards; `--shadow-overlay`
for modals/drawers/popovers. Nothing in this system uses a third, heavier
shadow — depth stays restrained per the spec.

### Motion

`--transition-fast` 150ms / `--transition-normal` 240ms, both
`cubic-bezier(0.16, 1, 0.3, 1)`. Every animated property (opacity, transform,
width, background) explains a state change — nothing animates for
decoration. `prefers-reduced-motion: reduce` collapses all durations to
1ms globally (see `tokens.css` and `base.css`).

## 4. Iconography

A single hand-drawn, Lucide-style line-icon set (24×24, `stroke-width: 2`,
round caps/joins, `stroke="currentColor"`) lives in
`assets/icons/sprite.svg` (~44 icons) and is **inlined into every page's
`<body>`** at build time. This is a deliberate technical choice: `<use
href="external.svg#id">` is unreliable when a page is opened directly as a
`file://` URL (no local server), which this prototype must support. Inlining
guarantees icons render regardless of how the file is opened. `assets/icons/
sprite.svg` remains in the repo as the canonical source for the icon set.

Icons never appear without a visible text label for anything load-bearing;
icon-only controls (collapse sidebar, close modal, theme toggle) always
carry `aria-label`.

## 5. Layout rules

- Desktop sidebar: 240px expanded / 72px collapsed, user-toggleable.
- Content max-width: 1180px, centered, with 32px padding at desktop scaling
  down at smaller breakpoints (see `RESPONSIVE_BEHAVIOR.md`).
- Cards answer exactly one question. If a card starts answering two, it must
  be split (Design Commandment #4).
- One primary action (`.btn-primary`) per screen. Every screen in this
  prototype was checked against this rule — see the review checklist in
  §8.

## 6. Accessibility baked into the tokens

Two token values were **adjusted from a literal reading of the visual
identity spec** because they failed WCAG 2.1 AA contrast when measured:

- `--color-border-strong` (input/control borders) was `#D8D2C8` (1.4:1
  against white — invisible as a control boundary). Changed to `#9C917D`
  (3.0–3.1:1), meeting the 3:1 non-text contrast requirement for UI
  component boundaries, in both light and dark mode.
- A new `--color-warning-text` (`#8A4A16` light / inherits the dark warning
  color) was introduced because `--color-warning` (`#D97724`) as *text* on
  `--color-warning-soft` measured 2.96:1 — under the 4.5:1 text requirement.
  `--color-warning` is preserved unchanged for large-scale/decorative use
  (module identity, icon fills on white); `--color-warning-text` is used
  specifically for small text and icons sitting on tinted backgrounds
  (warning badges, attention icons, receipt-review "check this" state).
- `--color-accent-strong` (`#AD5811`) was added for `.btn-accent` so white
  button text clears 4.5:1 (the raw `--color-accent` only reaches 3.17:1).

All other token pairs in the palette were measured and pass AA at their
intended text size. This is the one place in the prototype where visual
identity and usability conflicted, per the brief's own instruction: *"If a
visual requirement conflicts with usability, explain the conflict and
choose the option that is easiest and clearest for the store owner."* Full
methodology in `ACCESSIBILITY_SPECIFICATION.md`.

## 7. Prohibited vocabulary (enforced across every screen)

| Never | Always |
|---|---|
| Submit | Save / Confirm / Add |
| Execute | (name the actual action) |
| Process entity | Product |
| Transaction failed | We couldn't save your changes |
| Validation exception | (plain description of what's wrong) |
| Inventory mutation | Stock update |
| OCR extraction | (never mentioned — receipts just "get prepared") |
| Low-stock threshold breach | Almost out / Low stock |
| System operation completed | Done — with what happened, stated plainly |
| Confidence: 84% | *(never shown — see Receipts, below)* |

## 8. Prohibited patterns

No dense data-grid as primary content on any screen. No stat-card walls. No
icon-only primary actions. No confidence percentages anywhere in the
receipts flow. No decorative illustrations or mascots. No gradients or
glassmorphism. No more than one `.btn-primary` per screen. These were
checked screen-by-screen; see the review checklist below.

## 9. Internal design review (self-audit)

Every screen in this prototype was checked against the brief's own
checklist before being considered done:

- Purpose identifiable within 3 seconds — via a consistent
  `content-header` (title + one-line context) at the top of every screen.
- Single dominant primary action — verified per screen in
  `SCREEN_SPECIFICATIONS.md`.
- Nothing present "because dashboards usually have it" — the Dashboard has
  five sections, matching the PRD's hierarchy exactly, no more.
- Plain-language labels throughout — see §7.
- Controls sized for touch (44×44px minimum) — see
  `ACCESSIBILITY_SPECIFICATION.md`.
- States communicated without relying on color alone — every status badge
  pairs an icon + a word, never a color chip alone.
