# CMR Application Design System

## Color Palette: Crimson & Off-White (Bold)

The application utilizes a bold, high-contrast semantic color system built around the official company logo colors: Crimson Red (`#AF2025`) and Off-White (`#FFFFFE`).

### Light Mode

*   **Background (`bg-background`):** Off-white (`#FFFFFE`) - the base application background.
*   **Surfaces (`bg-surface`):** Pure white (`#FFFFFF`) - used for cards, modals, and elevated elements.
*   **Elevated Surfaces (`bg-surface-elevated`):** Very subtle gray (`#F9FAFB`) - used for hovers or secondary nested cards.
*   **Primary Text (`text-primary`):** Espresso (`#3D2C24`) - deep brown/black for high readability against light backgrounds.
*   **Secondary Text (`text-secondary`):** Muted gray (`#4B5563`).
*   **Brand / Primary Actions (`bg-brand`, `bg-primary`, text accents):** Crimson Red (`#AF2025`).
*   **Chrome (`bg-chrome`):** Espresso (`#3D2C24`) - used for heavy structural elements like sidebars or mobile headers.

### Dark Mode

Dark mode shifts to deep grays and blacks while keeping the brand red prominent.

*   **Background (`bg-background`):** Deep gray (`#111827`).
*   **Surfaces (`bg-surface`):** Lighter dark gray (`#1F2937`).
*   **Elevated Surfaces (`bg-surface-elevated`):** Mid-gray (`#374151`).
*   **Primary Text (`text-primary`):** Off-white (`#FFFFFE`).
*   **Secondary Text (`text-secondary`):** Muted gray (`#9CA3AF`).
*   **Brand / Primary Actions:** Brightened Crimson (`#D6454A`) to ensure WCAG compliant contrast against dark backgrounds.
*   **Chrome (`bg-chrome`):** Deep gray (`#111827`).

### Legacy Palette (Deprecated)
The legacy "Brass & Cream" palette (`bg-paper`, `bg-cream`, `text-ink`, `text-copper`, etc.) is officially deprecated. All new UI development must use the semantic tokens defined above (e.g., `bg-background`, `text-primary`, `text-brand-red`).

## Typography
(Typography guidelines remain unchanged, utilizing Tajawal, Cairo, and IBM Plex Mono).
