import { createJSONStorage, type StateStorage } from "zustand/middleware";

/**
 * IndexedDB storage adapter for onboarding store.
 * Supports much larger storage limits than localStorage (typically 50% of available disk space),
 * making it suitable for storing large base64-encoded images (logos, banners, etc.).
 * Falls back to localStorage if IndexedDB is not available.
 */
const DB_NAME = "cal-onboarding-idb";
const DB_VERSION = 1;
const STORE_NAME = "keyval";

// Cache database connection to avoid opening/closing repeatedly
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Reset promise on close so we can reconnect if needed
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
  });

  return dbPromise;
}

async function getItem(key: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails (will throw if quota exceeded)
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage quota exceeded even in fallback - not much we can do
    }
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore errors on remove
    }
  }
}

/**
 * IndexedDB storage adapter that implements StateStorage interface.
 * This provides much larger storage capacity than localStorage, making it suitable for
 * storing large base64-encoded images (logos, banners, etc.).
 */
const indexedDBStateStorage: StateStorage = {
  getItem,
  setItem,
  removeItem,
};

/**
 * IndexedDB storage adapter that implements the PersistStorage interface for zustand persist.
 * Uses createJSONStorage to handle JSON serialization/deserialization automatically.
 */
export const onboardingIndexedDBStorage = createJSONStorage(() => indexedDBStateStorage);
