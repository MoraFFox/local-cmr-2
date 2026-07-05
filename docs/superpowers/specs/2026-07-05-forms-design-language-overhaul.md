# Forms & Wizard Design Language Overhaul

**Date:** 2026-07-05  
**Branch context:** `feat/ui-ux-overhaul`  
**Scope:** Form wizard and all other forms in the local-CMR app.

## 1. Goal

Elevate the overall visual identity of every form surface so the product feels modern, cohesive, and premium. Fix the current two-tone problem where admin surfaces use hard-coded `teal-*` / `slate-*` values while the technician portal uses a separate dark language.

## 2. User Choices

The following decisions were validated through the visual companion:

| Decision | Selected option |
|----------|-----------------|
| Visual direction | **C. Warm Energetic Orange** |
| Design system scope | **B. Full — global design tokens** |
| Wizard layout | **A. Vertical stepper sidebar** |
| Input style | **B. Outlined labels** |
| Motion level | **C. Rich micro-interactions** |
| Implementation approach | **1. Token-first CSS refactor** |

## 3. Visual Direction

A dark teal-first palette with a bold red accent.

| Token role | Color name | Hex | Purpose / application |
|------------|------------|-----|-----------------------|
| App background | Midnight Teal | `#081619` | The master backdrop. Keeps contrast ratios soft on the eyes. |
| Surface / container | Deep Teal | `#102A30` | For structural blocks, dashboard cards, and content areas. |
| Surface elevated | Sea Glass | `#1A434C` | Hover states, active dropdowns, or nested card components. |
| Primary text | White Onyx | `#EAF2F3` | Crisp, high-readability foreground for headers and body text. |
| Muted text | Misted Sage | `#829A9E` | Secondary metadata, captions, and disabled states. |
| Accent / action | Lava Falls | `#E63923` | Call-to-action buttons, key notifications, or destructive actions. |

- **Primary accent:** `lava-500` (`#E63923`) for actions, active step, focus rings.
- **Accent hover/pressed:** `#c42b1a` / `#9e1f12`.
- **App background:** `#081619`.
- **Surface:** `#102A30`; elevated surface: `#1A434C`.
- **Text:** `#EAF2F3` primary, `#829A9E` secondary.
- **Borders:** `#1A434C` default, `#E63923` focus.
- **Success/error:** keep existing semantic `success-*` for validation; destructive actions share the accent red, so add a distinct success green for positive feedback.
- **Shadows:** dark, cool-tinted elevation (`shadow-black/30`, `shadow-lg`).

## 4. Design Tokens

Extend `tailwind.config.js` with a semantic layer that maps to the new language.

```js
colors: {
  midnight: '#081619',
  deep: '#102A30',
  sea: '#1A434C',
  onyx: '#EAF2F3',
  sage: '#829A9E',
  lava: {
    50: '#fdecea',
    100: '#f9c8c3',
    200: '#f5a39d',
    300: '#f07f77',
    400: '#ec5b51',
    500: '#E63923',
    600: '#c42b1a',
    700: '#9e1f12',
    800: '#77150d',
    900: '#500c08',
  },
  surface: {
    DEFAULT: '#102A30',
    elevated: '#1A434C',
    muted: '#081619',
  },
}
```

Update CSS custom properties in `index.css`:

```css
:root {
  --bg-body: #081619;
  --bg-surface: #102A30;
  --bg-surface-elevated: #1A434C;
  --text-primary: #EAF2F3;
  --text-secondary: #829A9E;
  --border-default: #1A434C;
  --border-focus: #E63923;
  --ring-focus: #E63923;
}
```

Remove the existing light/cream brand theme for form surfaces. All form surfaces now render on the dark teal palette; the `dark` class is optional because the base theme is already dark.

## 5. Global Primitives

Replace or extend the existing `.input-base`, `.btn-primary`, `.btn-secondary`, and `.surface` primitives in `index.css`. Inputs must be dark-background with light text to sit on the Midnight Teal app background.

- **`.input-base`**: `#102A30` background, `#1A434C` border, rounded-lg, label outside, focus `#E63923` + `ring-lava-500/20`.
- **`.btn-primary`**: `#E63923` background, `#EAF2F3` text, hover `#c42b1a`, active scale, shadow-sm.
- **`.btn-secondary`**: `#102A30` background, `#1A434C` border, `#EAF2F3` text, hover `#1A434C`.
- **`.surface`**: `#102A30` background, `#1A434C` border.
- **`.surface-elevated`**: `#1A434C` background, dark shadow.

## 6. Wizard Layout

Convert the form wizard (`src/views/FormWizardView.tsx`) from a long single-page split pane to a **vertical stepper sidebar**:

- Right sidebar (RTL) lists 3–6 named steps with an orange active indicator.
- Main area shows the current step's fields in an elevated card.
- Live preview remains available but collapses behind a toggle on small screens and sits in a second column on large screens.
- Step navigation: "السابق" / "التالي" / "إنشاء".
- Step status: upcoming (muted), current (orange, filled), completed (orange check).

## 7. Input Style

Standardize on **outlined labels** for all forms:

- Label rendered as a separate element above the input.
- Helper text below the field in secondary text.
- Error state: `red-500` border, `red-50` background tint, `red-600` message, shake animation on first error.
- Focus: `accent-500` border + ring.
- Disabled: muted background, reduced opacity.

Apply to `TextInput`, `<select>`, `<textarea>`, date pickers, and custom selects. Remove inline `<select>` and `<textarea>` styles that bypass `input-base`.

## 8. Rich Micro-interactions

Add motion that respects `prefers-reduced-motion` (already partially handled in `index.css`):

- Step transitions: fade + slight horizontal slide when changing steps.
- Accordion height animation in the maintenance editor.
- Toast slide-in from top-right for success/error messages.
- Button press: `active:scale-[0.98]`.
- Validation: subtle horizontal shake on invalid submit; icon pop-in.
- Loading skeletons for async sections.
- Completion: a small success illustration + confetti-like burst (CSS-only or lightweight canvas).

Do not add a new animation library; extend the existing `styles/animations.css` with custom keyframes and use Tailwind `animate-*` utilities.

## 9. Other Forms to Update

Apply the same primitives to:

- `CompanyEditModal.tsx`
- `BatchEditModal.tsx`
- `MaintenanceRecordEditor.tsx` / `MobileMaintenanceEditor.tsx` / `SplitPaneMaintenanceEditor.tsx`
- `AdminLogin.tsx` / `TechnicianLogin.tsx`
- `ResetPassword.tsx` / `InviteSignup.tsx`
- `UserAccessManagement.tsx`
- `ImportExportDialog.tsx`
- Filter panels in `HistoryPage.tsx` and `BaristasPage.tsx`

## 10. Validation & Feedback

As part of the visual overhaul, standardize feedback:

- Replace `alert()` and `window.confirm()` with a toast + confirm dialog primitive.
- Inline validation messages under fields.
- Disable submit until required fields are valid, with a visible "completed N of M" indicator in the wizard stepper.

## 11. Accessibility

- Maintain RTL layout; all new icons must support `dir="rtl"`.
- Focus rings remain visible and high-contrast against cream backgrounds.
- Color is never the only indicator of state; pair with icons/text.
- Respect `prefers-reduced-motion`.

## 12. Migration Order

1. Add semantic tokens to `tailwind.config.js` and `index.css`.
2. Rebuild primitives in `index.css` (`input-base`, buttons, surfaces).
3. Create a `Stepper` component for the wizard.
4. Refactor `FormWizardView.tsx` to the vertical stepper layout.
5. Migrate remaining forms and modals.
6. Replace `alert()` / `window.confirm()` with toast/dialog primitives.
7. Add rich micro-interactions and skeletons.
8. Run smoke tests and visual regression checks.

## 13. Out of Scope

- Redesigning dark mode beyond token alignment.
- Adding a full component library like shadcn/ui or MUI.
- Rewriting form logic or data models.

## 14. Success Criteria

- No hard-coded teal/slate values remain on form surfaces.
- All forms share the same input, button, card, and focus styles.
- The wizard uses the vertical stepper layout with smooth step transitions.
- `alert()` / `window.confirm()` are gone from form flows.
- Animations respect reduced motion.
