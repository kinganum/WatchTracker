# Real-time Synchronization Guide

This document explains how the WatchTracker application achieves real-time data synchronization across different clients and devices using Supabase Realtime.

## 1. Mechanism

The real-time functionality is powered by Supabase's built-in Realtime engine, which listens to PostgreSQL's logical replication stream. When a change (INSERT, UPDATE, DELETE) occurs in the `watchlist` table, Supabase detects it and broadcasts a message to all subscribed clients.

For this to work, two things are required on the Supabase side:
1.  **RLS Policies**: Row Level Security must be configured to control who receives which events.
2.  **Publication**: Supabase automatically manages a publication for tables that have RLS enabled.

## 2. Frontend Implementation

The entire real-time logic is handled within the main `App.tsx` component.

### Subscribing to Changes

A subscription is created as soon as a user is logged in.

```typescript
// From App.tsx
useEffect(() => {
    if (!user) return;

    const channel = supabase
        .channel(`watchlist_changes_${user.id}`)
        .on<WatchlistItem>(
            'postgres_changes',
            {
                event: '*', // Listen to INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'watchlist',
                filter: `user_id=eq.${user.id}` // Only get changes for the current user
            },
            payload => {
                // Handle the payload
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}, [user, fetchWatchlist]);
```

### Handling Events

The `payload` object from the callback contains all the information needed to update the local state.

- **`INSERT`**:
  - When a new item is added, the `payload.new` object contains the complete database record.
  - The app's logic includes a crucial step to reconcile optimistic updates. When a user adds an item, a temporary version is created locally with an ID like `temp-12345`. The `INSERT` handler finds this temporary item (by matching title and type) and replaces it with the final record from `payload.new`, which has the permanent UUID. This ensures the UI stays in sync.

- **`UPDATE`**:
  - The `payload.new` object contains the updated item.
  - The app finds the corresponding item in the local `watchlist` array by its `id` and merges the new data, triggering a re-render.

- **`DELETE`**:
  - The `payload.old` object contains the data of the deleted item, including its `id`.
  - The app filters the local `watchlist` array to remove the item with the matching `id`.

## 3. User Experience Enhancements

The real-time updates are coupled with UI enhancements for a smoother experience.

- **Optimistic Updates**: Most actions (add, delete, update) are applied to the local state *before* the API call completes. This makes the UI feel instantaneous. If the API call fails, the local state is reverted (rollbacked) to its original state.
- **Auto-Scroll**: When a new item is added (especially via Smart Paste), the `scrollToId` state is updated. A `useEffect` hook then finds the corresponding item's DOM element and smoothly scrolls it into view.
- **Highlight Animation**: Newly added items are given a temporary glowing animation (`animate-glow-neutral` or `animate-glow-anime`) to provide a clear visual cue of what just changed. The `newlyAddedIds` state array tracks which items to highlight. The highlight is removed after the animation completes.

## 4. Fallback

The real-time system is robust, but there is an implicit fallback. If the WebSocket connection for real-time events is ever dropped, the data will be out of sync until the user performs an action or reloads the page. Upon a full page reload, `fetchWatchlist()` is always called, which guarantees that the latest state is fetched directly from the database.
