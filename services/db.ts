import { WatchlistItem, SyncAction, UpdateCacheEntry, UpcomingRelease } from '../types';

// These types are for structuring the cache entry for the Discovery Hub.
// They are defined here to avoid complex cross-service imports.
export type ReleaseInfo = {
    name: string;
    status: string;
    releaseDate: string;
    expectedDate: string;
    platform: string;
};

export type Recommendation = {
    title: string;
    description: string;
    genre: string;
    sub_type: string;
    cast: string[];
    platform: string;
    dub: string;
    item_type: 'TV Series' | 'Movie';
    count: number;
};

export type DiscoveryCacheData = {
    release?: ReleaseInfo;
    recommendations?: Recommendation[];
}

export type DiscoveryCacheEntry = {
    itemId: string;
    data: DiscoveryCacheData;
    timestamp: number;
};

const DB_NAME = 'WatchTrackerDB';
const DB_VERSION = 4; // Incremented from 3 to 4
const STORE_NAME = 'watchlist';
const SYNC_QUEUE_STORE_NAME = 'sync_queue';
const UPDATES_CACHE_STORE_NAME = 'updates_cache';
const DISCOVERY_CACHE_STORE_NAME = 'discovery_cache'; // New store

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB error:', request.error);
            reject('Error opening database');
        };

        request.onsuccess = (event) => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains(SYNC_QUEUE_STORE_NAME)) {
                dbInstance.createObjectStore(SYNC_QUEUE_STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
            if (!dbInstance.objectStoreNames.contains(UPDATES_CACHE_STORE_NAME)) {
                dbInstance.createObjectStore(UPDATES_CACHE_STORE_NAME, { keyPath: 'itemId' });
            }
            // Add the new store for the Discovery Hub cache
            if (!dbInstance.objectStoreNames.contains(DISCOVERY_CACHE_STORE_NAME)) {
                dbInstance.createObjectStore(DISCOVERY_CACHE_STORE_NAME, { keyPath: 'itemId' });
            }
        };
    });
}

export async function saveWatchlist(watchlist: WatchlistItem[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear(); // Clear before saving new state
        watchlist.forEach(item => {
            store.put(item);
        });

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = (event) => {
            console.error('Error saving watchlist to IndexedDB:', transaction.error);
            reject(transaction.error);
        };
    });
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result as WatchlistItem[]);
        };

        request.onerror = (event) => {
            console.error('Error getting watchlist from IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

// --- Sync Queue Functions ---

export async function addActionToQueue(action: Omit<SyncAction, 'id' | 'timestamp'>): Promise<void> {
    const db = await openDB();
    const queuedAction: Omit<SyncAction, 'id'> = { ...action, timestamp: Date.now() };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.add(queuedAction);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getActionsFromQueue(): Promise<SyncAction[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result as SyncAction[]);
        request.onerror = () => reject(request.error);
    });
}

export async function updateActionInQueue(action: SyncAction): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.put(action);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function removeActionFromQueue(actionId: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.delete(actionId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}


export async function clearActionQueue(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(SYNC_QUEUE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(SYNC_QUEUE_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- Updates Cache Functions ---

export async function getUpdateFromCache(itemId: string): Promise<UpdateCacheEntry | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(UPDATES_CACHE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(UPDATES_CACHE_STORE_NAME);
        const request = store.get(itemId);

        request.onsuccess = () => resolve(request.result as UpdateCacheEntry | null);
        request.onerror = () => reject(request.error);
    });
}

export async function saveUpdateToCache(itemId: string, data: UpcomingRelease): Promise<void> {
    const db = await openDB();
    const entry: UpdateCacheEntry = { itemId, data, timestamp: Date.now() };
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(UPDATES_CACHE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(UPDATES_CACHE_STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- Discovery Hub Cache Functions ---

export async function getDiscoveryFromCache(itemId: string): Promise<DiscoveryCacheEntry | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DISCOVERY_CACHE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(DISCOVERY_CACHE_STORE_NAME);
        const request = store.get(itemId);

        request.onsuccess = () => resolve(request.result as DiscoveryCacheEntry | null);
        request.onerror = () => reject(request.error);
    });
}

export async function saveDiscoveryToCache(itemId: string, newData: DiscoveryCacheData): Promise<void> {
    const db = await openDB();
    const existingEntry = await getDiscoveryFromCache(itemId);
    
    const mergedData: DiscoveryCacheData = {
        ...(existingEntry?.data || {}),
        ...newData,
    };
    
    const entry: DiscoveryCacheEntry = { itemId, data: mergedData, timestamp: Date.now() };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DISCOVERY_CACHE_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(DISCOVERY_CACHE_STORE_NAME);
        const request = store.put(entry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}