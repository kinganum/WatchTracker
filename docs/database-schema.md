# Database Schema (Supabase)

This document details the Supabase PostgreSQL database schema for the WatchTracker application.

## 1. Connection Details

The application connects to Supabase using the client library. Credentials should be stored securely.

- **Supabase URL**: `https://dzzaitjvtwdmwinzxwzu.supabase.co`
- **Supabase Anon Key**: (Stored in `services/supabase.ts`, should be replaced with environment variables in a production build)

## 2. Table: `watchlist`

This is the primary table that stores all watchlist items for all users.

### SQL Schema

```sql
CREATE TABLE public.watchlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    sub_type text,
    status text NOT NULL,
    season integer,
    episode integer,
    part integer,
    language text,
    release_type text,
    favorite boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Primary Key
ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_pkey PRIMARY KEY (id);

-- Foreign Key to auth.users
ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Real-time
ALTER TABLE public.watchlist REPLICA IDENTITY FULL;
```

### Column Descriptions

| Column         | Type                       | Description                                                                 |
|----------------|----------------------------|-----------------------------------------------------------------------------|
| `id`           | `uuid` (Primary Key)       | Unique identifier for each watchlist item.                                  |
| `created_at`   | `timestamp with time zone` | The timestamp when the item was created.                                    |
| `updated_at`   | `timestamp with time zone` | The timestamp when the item was last updated. Automatically managed.        |
| `user_id`      | `uuid` (Foreign Key)       | References the `id` in the `auth.users` table. Links the item to a user.    |
| `title`        | `text`                     | The title of the movie, series, or anime.                                   |
| `type`         | `text`                     | The main type of the item (e.g., 'TV Series', 'Movies'). From `ItemType` enum. |
| `sub_type`     | `text` (nullable)          | The sub-category (e.g., 'Anime', 'Bollywood'). From `SubType` enum.         |
| `status`       | `text`                     | The user's progress status (e.g., 'Watch', 'Completed'). From `Status` enum. |
| `season`       | `integer` (nullable)       | The season number, for TV series.                                           |
| `episode`      | `integer` (nullable)       | The episode number, for TV series.                                          |
| `part`         | `integer` (nullable)       | The part number, for items released in parts.                               |
| `language`     | `text` (nullable)          | The audio language (e.g., 'DUB', 'SUB'). From `Language` enum.              |
| `release_type` | `text` (nullable)          | Whether the item is a 'New' or 'Old' release. From `ReleaseType` enum.      |
| `favorite`     | `boolean`                  | `true` if the user has marked the item as a favorite. Defaults to `false`.  |

## 3. Row Level Security (RLS)

RLS is enabled on the `watchlist` table to ensure data privacy and security. Users can only access and modify their own data.

### Policies

1.  **SELECT Policy**: Users can only read their own watchlist items.
    ```sql
    CREATE POLICY "Enable read access for own items"
    ON public.watchlist FOR SELECT
    USING (auth.uid() = user_id);
    ```

2.  **INSERT Policy**: Users can only create watchlist items for themselves.
    ```sql
    CREATE POLICY "Enable insert for own items"
    ON public.watchlist FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    ```

3.  **UPDATE Policy**: Users can only update their own watchlist items.
    ```sql
    CREATE POLICY "Enable update for own items"
    ON public.watchlist FOR UPDATE
    USING (auth.uid() = user_id);
    ```

4.  **DELETE Policy**: Users can only delete their own watchlist items.
    ```sql
    CREATE POLICY "Enable delete for own items"
    ON public.watchlist FOR DELETE
    USING (auth.uid() = user_id);
    ```
