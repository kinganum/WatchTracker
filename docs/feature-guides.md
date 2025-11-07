# Feature Guides

This document provides a detailed explanation of the application's key features.

## 1. Smart Paste

The Smart Paste feature allows users to add multiple watchlist items from a block of unstructured text.

- **Location**: `HomePage.tsx` (UI) and `utils/smartPasteParser.ts` (logic).
- **Logic**: The parser processes text line by line, using regular expressions to identify keywords related to an item's properties.

### Supported Keywords & Patterns

- **Season**: `s<number>`, `season <number>` (e.g., `s1`, `season 01`).
- **Episode**: `e<number>`, `ep <number>` (e.g., `e12`, `ep.10`).
- **Part**: `p<number>`, `part <number>` (e.g., `p2`, `part 1`).
- **Type**: `series`, `tv`, `movie`, `film`. Defaults to `TV Series` if not specified.
- **Sub-Type**: Any value from the `SubType` enum (e.g., `Anime`, `Bollywood`, `Hollywood`).
- **Status**: `continue`, `watch`, `stopped`, `completed`.
- **Language**: `dub`, `sub`, `eng`, `jpn`.
- **Release Type**: `new`, `old`.

### Context Headers

The parser supports "header" lines that set default values for all subsequent lines until a new header is found. A header is a line that contains a sub-type but no item-specific markers (like season/episode).

**Example**:
```
Anime Continue Old
One Piece
Jujutsu Kaisen

Hollywood Movie New
Dune
Oppenheimer
```
In this example, "One Piece" and "Jujutsu Kaisen" will be parsed as `SubType: Anime`, `Status: Waiting`, and `ReleaseType: Old`. "Dune" and "Oppenheimer" will be parsed as `SubType: Hollywood`, `Type: Movies`, and `ReleaseType: New`.

### Duplicate Prevention

- The parser checks against both the existing watchlist in the database and items already parsed in the current batch.
- A duplicate is defined as an item with the same **title** and **type**.
- Duplicates are identified and shown in the "Duplicates Skipped" section of the preview modal; they are not added.

## 2. Manual Add

This is the standard form for adding a single item.

- **Location**: `HomePage.tsx` (in the `ManualPasteForm` component).
- **Title Formatting**: The `formatTitle` utility automatically capitalizes the first letter of the title and trims whitespace.
- **Duplicate Check**: Before adding, the system checks if an item with the same title and type already exists. If so, an error toast is shown.

## 3. Copy Details

Each watchlist card has a "Copy" button for quickly sharing an item's progress.

- **Location**: `WatchlistItemCard.tsx`.
- **Output Format**: The copied text follows a clean, space-separated format:
  `[Title] Season [S] Part [P] Episode [E] [Type]`
  - Example: `One Piece Season 1 Part 1 Episode 10 DUB TV Series`
- **Implementation**: It constructs a string from the item's properties and uses the `navigator.clipboard.writeText` API.

## 4. Filtering & Sorting

The `WatchlistPage` provides powerful tools to manage the list.

- **Implementation**: A `useMemo` hook named `sortedAndFilteredWatchlist` computes the visible items whenever the watchlist data or filter/sort options change.
- **Filter Criteria**:
  - **Search**: Full-text search on the `title` field (case-insensitive).
  - **Status Cards**: Act as quick filters for a specific status (`Watch`, `Waiting`, etc.) or all items.
  - **Dropdowns**: Filter by `Type`, `Sub Type`, `Status`, and `Release Type`.
  - **Favorites**: A dedicated card to show only favorited items.
- **Dynamic Filter Counts**: Each dropdown filter option displays a live count of matching items. This count is context-aware, meaning it recalculates instantly as other filters are applied. For example, if you select "Movies", the counts within the "Status" filter will update to show how many movies are in "Completed", "Watch", etc.
- **Sort Options**:
  - Date Added (Newest First) - Default
  - Last Updated (Newest First)
  - Title (A-Z)
  - Title (Z-A)

## 5. Multi-Select & Bulk Actions

- **Activation**: Users can toggle "Multi Select" mode on the `WatchlistPage`.
- **Functionality**: In this mode, clicking on cards selects them. A "Delete (X)" button appears, allowing the user to delete all selected items in a single action. This action triggers a confirmation modal.
- **Temporary Items**: The logic correctly handles deleting a mix of already-saved items and newly-added temporary items (those with `temp-` IDs).