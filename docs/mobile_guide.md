# Mobile Optimization & Responsiveness Guide

This document outlines the strategies and best practices implemented to ensure the WatchTracker application provides a first-class user experience on mobile devices.

## 1. Responsive Layout Strategy

The application follows a **mobile-first** design philosophy using Tailwind CSS's responsive utility variants (`sm`, `md`, `lg`).

- **Default Styles**: Base styles are targeted at small (mobile) viewports.
- **Breakpoints**: Larger screen styles are applied at specific breakpoints.
  - `sm` (640px): Small tablets and landscape phones.
  - `md` (768px): Tablets.
  - `lg` (1024px): Laptops and desktops.
- **Key Responsive Components**:
  - **Watchlist Grid**: Stacks to a single column on mobile, transitioning to 2 columns on `sm` screens and 3 on `lg` screens. (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
  - **Filter Controls**: The filter bar stacks into a single, easy-to-use vertical layout on mobile. On `md` screens and up, it becomes a horizontal, wrapping row. Filter dropdowns and buttons become full-width on mobile for easier interaction.
  - **Forms**: The `ManualPasteForm` and `SmartPasteForm` on the homepage are arranged in a 2-column layout on `lg` screens but stack vertically on smaller devices.

## 2. Touch Targets & Interaction

To ensure usability on touch devices, all interactive elements adhere to mobile guidelines.

- **Minimum Size**: All buttons, icons, and interactive controls have a minimum tap area of **40x40px**. This is primarily achieved on the `WatchlistItemCard`'s action buttons by setting an explicit height and width (`h-10 w-10`).
- **Tactile Feedback**: To provide immediate feedback upon interaction, `active:scale-95` and other `active:` variants are used on buttons. This gives a satisfying "press" effect.
- **Mobile-Friendly Forms**: Numeric inputs (`season`, `episode`, `part`) use `type="number"` and `inputMode="numeric"` to trigger the appropriate mobile keyboard, simplifying data entry.

## 3. Performance & Perceived Speed

- **Component Memoization**: `React.memo` is used on the `WatchlistItemCard` component. Since the watchlist can grow large, this prevents unnecessary re-renders of list items that haven't changed, significantly improving performance during filtering, sorting, or real-time updates.
- **Optimistic UI**: The application's existing optimistic UI pattern is crucial for a fast perceived performance on mobile, where network latency can be higher.
- **Smooth Animations**: Animations are kept minimal and use performant CSS properties (`transform`, `opacity`). The highlight-on-add animation provides a clear visual cue without causing layout shifts.

## 4. Accessibility

- **Reduced Motion**: A global CSS rule is in place to respect the `prefers-reduced-motion` media query. If a user has this setting enabled, all non-essential animations and transitions are disabled.
- **ARIA Attributes**:
  - Toast notifications are wrapped in a `div` with `role="status"` and `aria-live="polite"` to ensure they are announced by screen readers.
  - Interactive elements like status filters use `aria-pressed` to indicate their current state.

## 5. Future Considerations

- **Full Offline Support**: While the current app is resilient to brief network interruptions, a full offline mode (using a service worker and IndexedDB) is a planned feature. This would allow users to add, edit, and delete items while completely offline and have the changes sync automatically upon reconnection.
- **Virtualization**: If user watchlists are expected to commonly exceed ~150-200 items, implementing a virtualized list (e.g., with TanStack Virtual) would be the next step to maintain high performance.