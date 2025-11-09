# Real-time Synchronization Guide

This document explains how the WatchTracker application achieves real-time data synchronization across different clients and devices using Supabase Realtime.

## 1. Mechanism

The real-time functionality is powered by Supabase's built-in Realtime engine, which listens to PostgreSQL's logical replication stream. When a change (INSERT, UPDATE, DELETE) occurs in the `watchlist` table, Supabase detects it and broadcasts a message to all subscribed clients.

For this to work, two things are required on the Supabase side:
1.  **RLS Policies**: Row Level Security must be configured to control who receives which events.
2.  **Publication**: Supabase automatically manages a publication for tables that have RLS enabled.

## 2. Frontend Implementation

The entire real-time logic is handled within the main `contexts/AppContext.tsx` component.

### Subscribing to Changes

A subscription is created as soon as a user is logged in.

```typescript
// From AppContext.tsx
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
}, [user]);
```

### Handling Events

The `payload` object from the callback contains all the information needed to update the local state.

- **`INSERT`**:
  - When a new item is added, the `payload.new` object contains the complete database record.
  - The app uses a robust reconciliation method for optimistic updates. When a user adds an item, a new UUID is generated on the client and the item is immediately added to the local state. This same UUID is sent to the database.
  - When an `INSERT` event arrives, the handler checks if an item with that same ID already exists locally. If it does (meaning it's the same client's optimistic update), the event is ignored to prevent duplication. If the ID doesn't exist, the item is added to the state, correctly syncing additions from other devices.

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
- **Highlight Animation**: Newly added items are given a temporary glowing animation (`animate-glow-neutral` or `animate-glow-anime`) to provide a clear visual cue of what just changed. The `highlightedIds` state array tracks which items to highlight. The highlight is removed after the animation completes.

## 4. Fallback

The real-time system is robust, but there is an implicit fallback. If the WebSocket connection for real-time events is ever dropped, the data will be out of sync until the user performs an action or reloads the page. Upon a full page reload, the app's initialization logic is always called, which guarantees that the latest state is fetched directly from the database and local cache.