import { WatchlistItem, SyncAction } from '../types';

const DB_NAME = 'WatchTrackerDB';
const DB_VERSION = 2;
const STORE_NAME = 'watchlist';
const SYNC_QUEUE_STORE_NAME = 'sync_queue';

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