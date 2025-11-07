# UI/UX Theme & Design Guide

This document defines the visual identity and design rules for the WatchTracker application to ensure a consistent and high-quality user experience. The theme is minimal, clean, and modern, with a focus on usability.

## 1. Color Palette

The color scheme is defined in the `<script>` tag of `index.html` as an extension of Tailwind's default theme.

| Name          | HSL Value               | Description                               |
|---------------|-------------------------|-------------------------------------------|
| `background`  | `hsl(0 0% 100%)`        | White. The main background color for pages. |
| `foreground`  | `hsl(240 10% 3.9%)`     | Almost Black. The primary text color.       |
| `card`        | `hsl(0 0% 100%)`        | White. Background for cards and modals.   |
| `primary`     | `hsl(240 5.9% 10%)`     | Dark Gray/Black. For primary buttons and active UI elements. |
| `primary-fg`  | `hsl(0 0% 98%)`         | Almost White. Text color on primary elements. |
| `secondary`   | `hsl(240 4.8% 95.9%)`   | Light Gray. For secondary backgrounds and buttons. |
| `secondary-fg`| `hsl(240 5.9% 10%)`     | Dark Gray. Text color on secondary elements. |
| `destructive` | `hsl(0 84.2% 60.2%)`    | Bright Red. For delete buttons and error states. |
| `muted`       | `hsl(240 4.8% 95.9%)`   | Light Gray. Background for muted elements.  |
| `muted-fg`    | `hsl(240 3.8% 46.1%)`   | Gray. Text color for muted/placeholder text. |
| `accent`      | `hsl(240 4.8% 95.9%)`   | Light Gray. For hover states on interactive elements. |
| `border`      | `hsl(240 5.9% 90%)`     | Light Gray. Default border color.          |
| `input`       | `hsl(240 5.9% 90%)`     | Light Gray. Default input border color.    |
| `ring`        | `hsl(240 5.9% 10%)`     | Dark Gray. Focus ring color for interactive elements. |

## 2. Typography

- **Font Family**: The default system `sans-serif` font stack is used for maximum compatibility and a native feel.
- **Headings**:
  - `h1`: `text-4xl` or `text-5xl`, `font-bold`. Used for main page titles.
  - `h2`: `text-2xl`, `font-semibold` or `font-bold`. Used for section titles.
  - `h3`: `text-xl`, `font-bold`. Used for card titles and sub-sections.
- **Body Text**: Default text size is `text-base` (16px). Smaller text (`text-sm`, `text-xs`) is used for supplementary information like timestamps or labels.

## 3. Layout & Spacing

- **Main Container**: The main content is wrapped in a container with `max-w-7xl mx-auto` to limit width on large screens.
- **Padding**: Consistent padding is applied to the main content area: `p-4 sm:p-6 lg:p-8`.
- **Component Spacing**: Gaps and margins are handled using Tailwind's spacing scale (e.g., `space-y-4`, `gap-4`).
- **Responsiveness**: A mobile-first approach is used. Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) adapt the layout for different screen sizes, especially for grid columns and flexbox direction.

## 4. Component Styling

- **Cards (`WatchlistItemCard`, `StatCard`)**:
  - **Background**: `bg-card`.
  - **Rounding**: `rounded-2xl` for a soft, modern look.
  - **Shadows**: `shadow-sm` or `shadow-md`. Hover effects often increase shadow to `shadow-lg`.
  - **Borders**: `border border-border` to provide subtle definition.
- **Buttons**:
  - **Primary**: `bg-primary text-primary-foreground`, `rounded-lg`, with a `hover:bg-primary/90` transition.
  - **Secondary**: `bg-secondary text-secondary-foreground`, `rounded-lg`.
  - **Icon Buttons**: Usually transparent with a `hover:bg-accent` effect and `rounded-full` shape for a minimal footprint.
- **Forms & Inputs**:
  - **Inputs/Selects**: `bg-background`, `border border-input`, `rounded-lg` or `rounded-md`.
  - **Focus State**: A visible focus ring is crucial for accessibility, using `focus:ring-2 focus:ring-ring`.

## 5. Icons

- **Source**: A custom `<Icon />` component in `components/Icons.tsx` houses all inline SVG icons. This keeps icons consistent and easy to manage.
- **Usage**: Icons are used to provide quick visual cues for actions (e.g., `trash` for delete), statuses (`check-circle` for completed), and categories (`film` for movies). They are always accompanied by text or a `title` attribute for accessibility.
