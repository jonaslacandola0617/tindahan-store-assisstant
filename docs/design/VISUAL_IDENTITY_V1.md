# Official Visual Identity & Design Specification

**Store Operating Assistant (Tindahan)**

*Design System Version: 1.0 — Final Specification*

---

## 1. Design Philosophy: Warm Utility

**Tindahan** is built on the philosophy of **Warm Utility**. It represents the intersection of structural discipline, quiet restraint, and human warmth.

The software draws inspiration from the design ethos of **Apple** (clarity, tactile warmth, material discipline), **Linear** (speed, focus, spatial efficiency), and **Notion** (typography, calm canvas, modular flexibility). It shares their restraint and usability without mimicking them, tailored specifically for small store owners.

> **Core Principle:** This is software for everyday store operators—not corporate enterprise users. Every screen must feel welcoming, calm, and practical. Never cold, never clinical, and never overwhelming.

---

## 2. Visual Identity & Brand Personality

### Brand Attributes

* **Calm:** Low visual noise, soothing neutral canvases, zero unnecessary alerts.
* **Intentional:** Every pixel, margin, and color has a distinct functional purpose.
* **Human:** Soft curves, approachable language, tactile paper-like depth.
* **Trustworthy:** Crisp typography, solid contrast, predictable feedback.
* **Practical:** High scannability, clear action paths, zero fluff.
* **Quiet & Efficient:** Fast workflows that get out of the store owner's way.
* **Premium & Minimal:** Uncluttered layouts that build pride of ownership.
* **Approachable:** Inviting, forgiving, and simple to learn on day one.

### Brand Mark Status

This specification defines Tindahan's visual personality but does not yet define final logo geometry. Until an approved logo asset exists, implementations may use a restrained provisional brand mark that works at small sizes, uses simple original vector geometry, and reflects **Warm Utility**. It must not be treated as the final logo, reduced to a generic letter inside a circle, resemble clip art, or imitate another product's identity.

---

## 3. Color System

Color is used purposefully to establish spatial structure, active states, and subconscious module identification.

### Light Mode (Default)

| Role | Token Name | Hex Value | Usage / Placement |
| --- | --- | --- | --- |
| **Primary Brand** | `color-brand-primary` | `#1B4D3E` | Key call-to-actions, active navigation text, focal points |
| **Primary Soft** | `color-brand-soft` | `#E8F2EE` | Soft button backgrounds, active nav pill indicators, badges |
| **Accent** | `color-accent` | `#D97724` | Warm highlights, warnings, attention badges, Receipts identity |
| **Canvas** | `color-canvas` | `#FAF8F5` | Off-white warm canvas background |
| **Surface** | `color-surface` | `#FFFFFF` | Main cards, modals, table surfaces, dropdown panels |
| **Border** | `color-border` | `#E6E2DC` | Soft, subtle structural lines & card borders |
| **Primary Text** | `color-text-primary` | `#1A1D1A` | Headings, high-contrast body text, primary labels |
| **Muted Text** | `color-text-muted` | `#5F665E` | Secondary captions, metadata, subtle field labels |

### Auxiliary Palette: Olive

| Token Name | Hex Value | Usage / Placement |
| --- | --- | --- |
| `color-olive-100` | `#EEF2E6` | Soft olive card tint (Insights background, highlight states) |
| `color-olive-300` | `#C9D4BF` | Subtle olive borders and divider accents |
| `color-olive-600` | `#6B7B52` | Inventory module indicator, soft status badges |

### Dark Mode (System Preference)

| Role | Token Name | Hex Value | Usage / Placement |
| --- | --- | --- | --- |
| **Background** | `color-dark-bg` | `#121513` | Deep warm dark canvas |
| **Surface** | `color-dark-surface` | `#1A1E1B` | Elevated card surfaces |
| **Border** | `color-dark-border` | `#2A302B` | Dark mode card dividers & borders |
| **Primary Emerald** | `color-dark-emerald` | `#34A872` | Accessible, high-contrast primary interactive state |

Dark-mode tokens must be implemented as part of the system foundation. The interface should honor the established system or stored preference when practical, but a dedicated appearance-settings workflow is deferred to the Settings phase. Dark mode must preserve warmth and accessibility without introducing a new configuration burden.

---

## 4. Module Color Identity

To reduce cognitive friction, modules use functional color accents to build subconscious familiarity:

| Module | Primary Color Identity | Tint / Surface Accent | Purpose |
| --- | --- | --- | --- |
| **Dashboard** | Emerald (`#1B4D3E`) | `#E8F2EE` | Core overview & operational home |
| **Inventory** | Olive (`#6B7B52`) | `#EEF2E6` | Stock management, counts, categories |
| **Sales** | Primary Emerald (`#1B4D3E`) | `#E8F2EE` | Fast sale recording and clear confirmation; remains in the primary brand family until a separate identity is approved |
| **Receipts** | Warm Amber (`#D97724`) | `#FDF6EE` | Supplier receipts, incoming stock extraction, review, and confirmation |
| **Reports** | Slate Neutral | `#F4F4F5` | Analytics, trends, financial insights |
| **Settings** | Neutral | `#F8F9FA` | System configuration & preferences |

Module identity is a restrained navigational and contextual accent, not full-screen color coding. Use it through active navigation, icon surfaces, selected controls, small page markers, and carefully chosen contextual cards. Do not tint every surface or introduce large saturated backgrounds.

---

## 5. Typography

The typography system favors legibility, generous line height, and structured hierarchy.

* **Primary Typeface:** `Plus Jakarta Sans`
* **Fallbacks:** `DM Sans`, `system-ui`, `-apple-system`, `sans-serif`

### Type Hierarchy

* **Headings:** Semi-bold weight (`600`), tight tracking (`-0.02em`).
* **Body Text:** Regular weight (`400`), generous line height (`1.6`).
* **Tables & Forms:** Clear, high-contrast numeric display with tabular numbers enabled for financial figures.

---

## 6. Shape & Elevation System

### Radius Tokens

* `8px` (`--radius-sm`): Tags, small inputs, buttons, tooltips.
* `14px` (`--radius-md`): Standard inputs, select menus, dropdowns, table containers.
* `20px` (`--radius-lg`): Standard content cards, main section panels.
* `28px` (`--radius-xl`): Drawers, major modal overlays, floating banners.

### Shadow System

Shadows are subtle, paper-like, and tactile without appearing heavy or glossy:

* **Subtle Elevation:** `0 1px 2px rgba(0, 0, 0, 0.03), 0 4px 12px -2px rgba(27, 77, 62, 0.04)`
* **Overlay Elevation:** `0 12px 32px -4px rgba(0, 0, 0, 0.08)`

---

## 7. Motion & Animation

Motion must always **explain**, never **entertain**.

* **Duration Scale:** `150ms` – `240ms`
* **Easing:** Smooth standard ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`)
* **Rules:** Zero bounce, zero elasticity, no exaggerated motion effects. Motion communicates state change, expansion, or drawer slides efficiently.

---

## 8. Layout & Grid Architecture

* **Platform Target:** Desktop-optimized and fully responsive across desktop, tablet, and mobile. Receipt capture, Inventory lookup, Sales recording, authentication, onboarding, and primary navigation are first-class mobile workflows rather than reduced desktop fallbacks.
* **Rhythm & Spacing:** Generous 24px–32px section gaps.
* **Background Hierarchy:** Warm off-white canvas (`#FAF8F5`) housing floating crisp white surface cards (`#FFFFFF`).

---

## 9. Component Philosophy

### Navigation (Sidebar)

* **Expanded Width:** `240px`
* **Collapsed Width:** `72px`
* **Active Item:** Highlighted by a Soft Emerald pill (`#E8F2EE`) with bold brand-colored text (`#1B4D3E`). Minimal, smooth collapse transition.

### Cards

Every card must **answer exactly one question** (e.g., *"What needs restocking?"* or *"What are today's sales?"*). Contextual cards use tailored surface fills:

```
+-----------------------------------------------------------------+
|  Today's Summary Card (Surface: Pure White #FFFFFF)              |
+-----------------------------------------------------------------+
|  Attention Required Card (Surface: Warm Cream #FDFBF7)           |
+-----------------------------------------------------------------+
|  Inventory Insights Card (Surface: Olive Tint #EEF2E6)          |
+-----------------------------------------------------------------+
|  Quick Actions Card (Surface: Soft Emerald #E8F2EE)             |
+-----------------------------------------------------------------+

```

### Tables

* Anti-enterprise formatting: No dense, oppressive grid lines.
* Rounded row containers with soft outer border boundaries.
* Comfortable cell padding (minimum 16px vertical).
* Subtle hover lift and highlight.

### Empty States

Every empty state must **educate, guide, and encourage**:

* Clear friendly headline describing the state.
* One actionable step to populate data or get started.
* Zero technical jargon or accusatory error messages.

---

## 10. Official Design Tokens (CSS Architecture)

```css
:root {
  /* Brand Colors */
  --color-brand-primary: #1B4D3E;
  --color-brand-soft: #E8F2EE;
  --color-accent: #D97724;

  /* Neutrals & Canvas */
  --color-canvas: #FAF8F5;
  --color-surface: #FFFFFF;
  --color-border: #E6E2DC;
  --color-text-primary: #1A1D1A;
  --color-text-muted: #5F665E;

  /* Auxiliary Olive Palette */
  --color-olive-100: #EEF2E6;
  --color-olive-300: #C9D4BF;
  --color-olive-600: #6B7B52;

  /* Typography */
  --font-family: 'Plus Jakarta Sans', 'DM Sans', system-ui, -apple-system, sans-serif;

  /* Radii */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;

  /* Elevation */
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.03), 0 4px 12px -2px rgba(27, 77, 62, 0.04);
  --shadow-overlay: 0 12px 32px -4px rgba(0, 0, 0, 0.08);

  /* Layout */
  --sidebar-width-expanded: 240px;
  --sidebar-width-collapsed: 72px;

  /* Motion */
  --transition-fast: 150ms cubic-bezier(0.16, 1, 0.3, 1);
  --transition-normal: 240ms cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="dark"] {
  --color-canvas: #121513;
  --color-surface: #1A1E1B;
  --color-border: #2A302B;
  --color-brand-primary: #34A872;
  --color-text-primary: #FAF8F5;
  --color-text-muted: #A0A69F;
}

```

---

## 11. Design Commandments

These ten commandments are mandatory for all future UI work in Tindahan:

1. **White space is a feature.** Give elements room to breathe.
2. **One primary action per screen.** Never confuse the store owner with competing focal points.
3. **Never use color without purpose.** Use color to communicate state, structure, or module identity—never for arbitrary decoration.
4. **Every card answers one question.** If a card tries to solve two problems, break it up.
5. **Motion explains.** Animate to clarify relationships or spatial origins, never to entertain.
6. **Data must feel approachable.** Present numbers with clear labels, tabular alignment, and human context.
7. **Default to calm.** Keep visual complexity extremely low.
8. **Reduce cognitive load.** Don't make store owners calculate or guess.
9. **Guide instead of exposing complexity.** Reveal advanced features progressively.
10. **Every interaction should reduce effort or increase confidence.** If an element does neither, remove it.
