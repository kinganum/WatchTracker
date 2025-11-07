import { User } from '@supabase/supabase-js';

export enum ItemType {
    TV_SERIES = 'TV Series',
    MOVIES = 'Movies',
}

export enum SubType {
    ANIME = 'Anime',
    BOLLYWOOD = 'Bollywood',
    HOLLYWOOD = 'Hollywood',
    ASIAN = 'Asian',
    TURKISH = 'Turkish',
    TOLLYWOOD = 'Tollywood',
    KOLLYWOOD = 'Kollywood',
    SANDALWOOD = 'Sandalwood',
}

export enum Status {
    WATCH = 'Watch',
    WAITING = 'Waiting',
    COMPLETED = 'Completed',
    STOPPED = 'Stopped',
}

export enum Language {
    SUB = 'SUB',
    DUB = 'DUB',
}

export enum ReleaseType {
    NEW = 'New',
    OLD = 'Old',
}

export interface WatchlistItem {
    id: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    title: string;
    type: ItemType;
    sub_type?: SubType;
    status: Status;
    season?: number;
    episode?: number;
    part?: number;
    language?: Language;
    release_type?: ReleaseType;
    favorite: boolean;
}

export type NewWatchlistItem = Omit<WatchlistItem, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'favorite'> & {
    favorite?: boolean;
};

export type ConfirmationConfig = {
    title: string;
    message: string;
    onConfirm: () => void;
};

export type SyncAction = {
    id: number; // Auto-incrementing primary key
    type: 'ADD' | 'ADD_MULTIPLE' | 'UPDATE' | 'DELETE' | 'DELETE_MULTIPLE';
    payload: any;
    timestamp: number;
};


export type AppContextType = {
    user: User | null;
    watchlist: WatchlistItem[];
    loading: boolean;
    addItem: (item: NewWatchlistItem) => Promise<string | undefined>;
    addMultipleItems: (items: NewWatchlistItem[]) => Promise<void>;
    updateItem: (id: string, updates: Partial<WatchlistItem>, options?: { successMessage?: string | null }) => Promise<boolean>;
    deleteItem: (id: string) => Promise<void>;
    deleteMultipleItems: (ids: string[]) => Promise<void>;
    editingItem: WatchlistItem | null;
    setEditingItem: (item: WatchlistItem | null) => void;
    geminiItem: WatchlistItem | null;
    setGeminiItem: (item: WatchlistItem | null) => void;
    highlightedIds: string[];
    setHighlightedIds: (value: string[] | ((prevState: string[]) => string[])) => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    setConfirmation: (config: ConfirmationConfig | null) => void;
    setScrollToId: (id: string | null) => void;
    scrollToId: string | null;
    view: 'home' | 'watchlist';
    setView: (view: 'home' | 'watchlist') => void;
    initialListFilter: 'favorites' | null;
    setInitialListFilter: (filter: 'favorites' | null) => void;
    initialSearch: string;
    setInitialSearch: (query: string) => void;
    toast: { message: string; type: 'success' | 'error' } | null;
    confirmation: ConfirmationConfig | null;
    isOnline: boolean;
    isSyncing: boolean;
    pendingSyncIds: string[];
};