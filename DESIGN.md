# CMR — Design System

> OpenDesign brand contract for the Coffee Machine Registry (CMR) application.
> AI agents MUST read this file before generating any UI code.

---

## Brand Identity

- **Name:** CMR (Coffee Machine Registry) — Midoe's internal tool
- **Vibe:** Brass & Cream — dark espresso chrome rail against warm paper. Coffee-specific without being literal. Tactical warmth.
- **Language:** Arabic (RTL) primary, with English fallbacks
- **Direction:** `direction: rtl;`

---

## Art Direction: Brass & Cream

The split that gives it identity: **dark espresso chrome** (sidebar + mobile header) against a **warm paper content area**. An espresso machine is literally dark chrome on top, warm coffee below — the UI mirrors its subject.

**The single bold move:** a `crema → copper` gradient (`#E8C9A0 → #B87333`) reserved *only* for the one primary CTA per screen. Everything else is disciplined — quiet cream surfaces, hairline borders, brass dividers.

---

## Color System

### Core Palette

| Token       | Hex       | Usage                              |
|-------------|-----------|------------------------------------|
| `paper`     | `#FAF6EF` | Page background (body)            |
| `cream`     | `#F1EADB` | Surface / card backgrounds         |
| `cream-2`   | `#E8DFCC` | Surface hover / elevated           |
| `cream-3`   | `#DED3B8` | Pressed / active surface           |
| `espresso`  | `#241B16` | Chrome (sidebar, header rail)      |
| `espresso-light` | `#3D2C24` | Chrome elevated / hover     |
| `espresso-lighter` | `#5C4639` | Chrome muted text          |
| `ink`       | `#3D2C24` | Primary text (same as espresso-light) |
| `latte`     | `#8A7468` | Secondary text, placeholders       |
| `hairline`  | `#D9CFB8` | Default borders                    |

### Accent — Copper (Primary Action)

| Token      | Hex       | Usage                          |
|------------|-----------|--------------------------------|
| `copper-50`  | `#fdf4eb` | Subtle hover backgrounds     |
| `copper-100` | `#f9e3cc` |                               |
| `copper-200` | `#f2c399` |                               |
| `copper-300` | `#e8a266` |                               |
| `copper-400` | `#d98940` |                               |
| `copper-500` | `#B87333` | **Focus rings, active indicators** |
| `copper-600` | `#9E5E28` | Button hover                   |
| `copper-700` | `#7D4A1E` | Pressed backgrounds             |
| `copper-800` | `#5E3715` |                               |
| `copper-900` | `#3F250D` |                               |

### Accent — Brass (Signature Element)

| Token   | Hex       | Usage                              |
|---------|-----------|------------------------------------|
| `brass` | `#C9A86A` | Hairline dividers, logo rail accents, section separators |

### CTA Gradient (Crema → Copper)

```css
background: linear-gradient(135deg, #E8C9A0 0%, #B87333 100%);
```
Reserved exclusively for the **single primary action** per screen. Never used for secondary buttons, badges, or decoration.

### Semantic — Leaf (Success / Completion / Sync)

| Token      | Hex       | Usage                            |
|------------|-----------|----------------------------------|
| `leaf-500` | `#4F7A52` | Completed steps, checkmarks, sync indicators |

### Semantic — Ember (Danger)

| Token      | Hex       | Usage                            |
|------------|-----------|----------------------------------|
| `ember-500` | `#C0392B` | Delete actions, error states, destructive confirmations |

### Chrome Text

| Token               | Hex       | Usage                      |
|----------------------|-----------|----------------------------|
| `text-on-chrome`     | `#F1EADB` | Primary text on espresso   |
| `text-muted-chrome`  | `#8A7468` | Muted text on espresso     |

---

## Typography

| Property     | Value                                              |
|--------------|----------------------------------------------------|
| Font family  | `Tajawal` (body), `Cairo` (display), `IBM Plex Mono` (data/IDs) |
| Display      | `font-display` → Cairo 700–800 for headings        |
| Body         | `text-sm` (14px) / `text-base` (16px)              |
| Headings     | `text-lg` (18px) / `text-xl` (20px) / `text-2xl` (24px) |
| Labels       | `text-xs` (12px) uppercase tracking-wider          |
| IDs/codes    | `font-mono text-xs tracking-wider` — IBM Plex Mono  |
| Weights      | 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extra-bold display) |

---

## Spacing System

Based on Tailwind defaults:
- `space-y-4` (16px) between form fields
- `gap-4` (16px) grid gaps
- `p-4` (16px) card padding desktop, `p-3` (12px) mobile
- `py-3` (12px) vertical button padding
- `px-4` (16px) horizontal button padding

---

## Motion & Animation

### Timing
- Fast micro-interactions: `duration-200`
- Step transitions: `duration-300` to `duration-500`
- Progress bars: `duration-500 ease-out`

### Easing Curves
- Standard: `cubic-bezier(0.215, 0.610, 0.355, 1.000)` — smooth deceleration
- Spring-like pop: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Slide: `cubic-bezier(0.32, 0.72, 0, 1)`

### Key Animations
- `animate-content-fade-in`: Fade + slide up on view change
- `animate-pop-in`: Scale bounce (checkmarks, badges)
- `animate-shimmer-sweep`: Progress bar shimmer
- `animate-slide-up/down`: Bottom sheet
- `animate-shake`: Inline validation error

---

## Component Primitives

### Button
```
Primary:   .btn-primary — crema→copper gradient, text-white, hover:brightness-110
Secondary: .btn-secondary — bg-cream, border-hairline, text-ink, hover:bg-cream-2
Ghost:     .btn-ghost — transparent, text-latte, hover:bg-cream
Danger:    .btn-danger — bg-ember-500, text-white, hover:bg-ember-600
Focus:     focus-visible:ring-2 focus-visible:ring-copper-500/30
Active:    active:scale-[0.98]
```

### Input
```
Base:     .input-base — bg-cream, border-hairline, text-ink, h-[50px]
Focus:    border-copper-500, ring copper-500/15
Placeholder: placeholder:text-latte
```

### Card / Surface
```
Surface:  .surface — bg-cream, border-hairline, rounded-xl
Elevated: .surface-elevated — bg-cream-2, border-hairline, rounded-xl
Chrome:   .chrome — bg-espresso, text-cream
```

### Brass Hairline (Signature)
```html
<div class="brass-hairline mx-2" />
```
Renders as a centered gradient `transparent → brass → transparent` 1px divider.

### Stamp ID (Signature)
```
.stamp-id — font-mono text-xs tracking-wider text-latte
```
For work-order numbers, submission IDs, timestamps — the field-service readout vernacular.

---

## Stepper Form Design Patterns

### Desktop (lg+) — Vertical Sidebar
```
Layout:   sticky top-6 w-64 bg-cream border-hairline rounded-xl p-4
Behavior: Each step is clickable to navigate (except future steps)
Visual:   Vertical timeline with numbered circles connected by lines
Active:   border-r-2 border-copper-500
```

### Mobile (<lg) — Horizontal Progress Bar
```
Layout:   bg-cream border-hairline rounded-xl p-3
Visual:   Step name label + "N / M" counter + thin progress bar
Progress: h-1.5 rounded-full bg-cream-3 with copper-500 fill, transition-all duration-500
```

---

## Glass Morphism / Liquid Glass

Warm-amber variant:
```
background: rgba(241, 234, 219, 0.35)
backdrop-filter: blur(24px) saturate(1.4) brightness(1.04)
border: 1px solid rgba(201, 168, 106, 0.25)
rim highlight: brass gradient
```

---

## Dark Mode

The Brass & Cream system is light-first with dark chrome built into the layout (sidebar, mobile header). The `dark` variant deepens the paper to a very dark warm brown (`#1A1210` body, `#2A1F1A` surface, `#3D2C24` elevated) — like a dimly lit café at night. Chrome surfaces go even darker (`#110D0A`). The brass and copper accents persist across both modes.

---

## Accessibility
- All interactive elements must have `aria-current="step"` on active step
- Navigation must be wrapped in `<nav aria-label="Progress">`
- Focus-visible rings on all interactive elements: `outline: 2px solid #B87333`
- Respect `prefers-reduced-motion`: disable animations
