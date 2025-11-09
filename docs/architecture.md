# WatchTracker Architecture

This document outlines the architecture of the WatchTracker application, a modern web app built with React and Supabase.

## 1. Technology Stack

- **Frontend**:
  - **Framework**: React 19
  - **Language**: TypeScript
  - **Styling**: Tailwind CSS (with JIT compiler via CDN script)
  - **Build Tool**: Vite (inferred from `index.html` setup)
  - **Client**: `@supabase/supabase-js` for backend communication.

- **Backend (BaaS)**:
  - **Provider**: Supabase
  - **Database**: PostgreSQL
  - **Authentication**: Supabase Auth (Email/Password)
  - **Real-time API**: Supabase Realtime for live data synchronization.

- **AI Integration**:
  - **Service**: Google Gemini (not yet implemented, but planned)
  - **Library**: `@google/genai`

## 2. Frontend Architecture

The frontend is a single-page application (SPA) built with React.

- **Application Type**: The application is a Progressive Web App (PWA), making it installable on user devices for a native-like experience with persistent offline storage.
- **Key Files & Components**:
  - **`index.tsx`**: The application's entry point. Renders the main `App` component into the DOM.
  - **`App.tsx`**: The root component. It manages:
    - **Global State**: Uses `React.Context` (`AppContext`) to provide state and actions (watchlist data, user session, CRUD functions) to the entire component tree.
    - **Authentication**: Handles user session logic, displaying `AuthPage` or the main app.
    - **Routing**: A simple view switcher (`'home' | 'watchlist'`) manages which page is displayed.
    - **Real-time Listener**: Establishes and manages the Supabase real-time subscription.
    - **Modals & Toasts**: Controls global UI elements like confirmation modals, edit modals, and toast notifications.
  - **`HomePage.tsx`**: The landing page. Features a welcome message, search bar, statistics cards, and forms for adding new items.
  - **`WatchlistPage.tsx`**: The main view for displaying, filtering, sorting, and managing watchlist items.
  - **`WatchlistItemCard.tsx`**: A reusable component to display a single watchlist item with all its details and action buttons (edit, delete, favorite, copy).
  - **Forms (`ManualPasteForm`, `SmartPasteForm`)**: Components for adding items, one for single entries and another for bulk parsing.
  - **Modals (`EditItemModal`, `ConfirmationModal`, etc.)**: Reusable modals for editing items, confirming actions, and previewing smart paste results.
  - **`components/Icons.tsx`**: An icon library component that renders different SVGs based on a `name` prop.
  - **`services/supabase.ts`**: Initializes and exports the Supabase client instance.
  - **`utils/smartPasteParser.ts`**: Contains the logic for parsing raw text into structured `NewWatchlistItem` objects.

### State Management

State is managed via `AppContext`, which centralizes all watchlist data and business logic. This avoids prop drilling and keeps the component structure clean. The context provides:
- `user`, `watchlist`, `loading` state.
- CRUD functions: `addItem`, `updateItem`, `deleteItem`, `addMultipleItems`, etc.

## 3. Backend Architecture (Supabase)

Supabase provides the entire backend infrastructure.

- **Database**: A single `watchlist` table stores all user data. It's linked to `auth.users` via a `user_id` foreign key.
- **Authentication**: Supabase handles user sign-up, sign-in, and session management. Row Level Security (RLS) policies ensure users can only access their own data.
- **Real-time**: The app subscribes to database changes (`INSERT`, `UPDATE`, `DELETE`) on the `watchlist` table. When a change occurs, Supabase pushes the new data to all connected clients, enabling live updates.

## 4. Data & Logic Flow

### A. Initial Load

1.  User visits the app.
2.  `App.tsx` initializes, checks for a Supabase session.
3.  If no session, `AuthPage` is shown.
4.  If session exists, `fetchWatchlist()` is called to get the user's data.
5.  A Supabase real-time channel is subscribed for live updates.
6.  The `HomePage` or `WatchlistPage` is rendered with the fetched data.

### B. Adding an Item (Optimistic UI)

1.  User submits the "Add Item" form.
2.  The `addItem` function is called.
3.  A new item with a client-generated UUID (`crypto.randomUUID()`) is immediately added to the local React state. This same UUID is sent to the database, making it the permanent ID. The UI updates instantly.
4.  An API call is made to insert the item into the Supabase `watchlist` table.
5.  **Success**: The real-time listener receives the `INSERT` event from Supabase. On the originating client, this event is typically ignored because an item with the same UUID already exists in the local state. On other clients, the new item is added to the state, keeping them in sync.
6.  **Failure**: The API call fails. The item with the client-generated UUID is removed from the local state (rollback), and an error toast is shown.

### C. Real-time Sync

1.  User A has the app open on two devices (Desktop and Mobile).
2.  User A deletes an item on Desktop.
3.  The `deleteItem` function optimistically removes the item from the Desktop UI and sends a `DELETE` request to Supabase.
4.  Supabase processes the request and broadcasts the `DELETE` event to all subscribed clients.
5.  The Mobile device's real-time listener receives the event and removes the corresponding item from its local state, updating the UI automatically.