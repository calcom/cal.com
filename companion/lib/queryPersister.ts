/// <reference types="chrome" />

/**
 * Unified Storage Persister for React Query Cache
 *
 * This module provides a cross-platform storage abstraction that works with:
 * - AsyncStorage for React Native (iOS/Android)
 * - chrome.storage for browser extensions
 * - localStorage as fallback for web
 *
 * The pattern is based on the existing AuthContext storage implementation
 * to maintain consistency across the codebase.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";
import { CACHE_CONFIG } from "../config/cache.config";

/**
 * Check if chrome.storage is available (browser extension context)
 */
const isChromeStorageAvailable = (): boolean => {
  return (
    Platform.OS === "web" &&
    typeof chrome !== "undefined" &&
    chrome.storage !== undefined &&
    chrome.storage.local !== undefined
  );
};

/**
 * Unified storage interface matching the pattern from AuthContext
 */
interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Create a storage adapter based on the current platform
 */
const createStorageAdapter = (): StorageAdapter => {
  // Browser extension context - use chrome.storage.local
  if (isChromeStorageAvailable()) {
    return {
      getItem: (key: string): Promise<string | null> => {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve((result[key] as string) || null);
          });
        });
      },
      setItem: (key: string, value: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      },
      removeItem: (key: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          chrome.storage.local.remove(key, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      },
    };
  }

  // Regular web app - use localStorage
  if (Platform.OS === "web") {
    return {
      getItem: (key: string): Promise<string | null> => {
        return Promise.resolve(localStorage.getItem(key));
      },
      setItem: (key: string, value: string): Promise<void> => {
        localStorage.setItem(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string): Promise<void> => {
        localStorage.removeItem(key);
        return Promise.resolve();
      },
    };
  }

  // React Native (iOS/Android) - use AsyncStorage
  return {
    getItem: (key: string): Promise<string | null> => {
      return AsyncStorage.getItem(key);
    },
    setItem: (key: string, value: string): Promise<void> => {
      return AsyncStorage.setItem(key, value);
    },
    removeItem: (key: string): Promise<void> => {
      return AsyncStorage.removeItem(key);
    },
  };
};

/**
 * Storage adapter instance
 */
const storage = createStorageAdapter();

/**
 * Create a React Query persister that works across all platforms
 *
 * This persister:
 * - Saves the query cache to platform-appropriate storage
 * - Restores cache on app launch for instant data display
 * - Handles serialization/deserialization of cache data
 * - Respects cache expiration (maxAge)
 */
export const createQueryPersister = (): Persister => {
  const storageKey = CACHE_CONFIG.persistence.storageKey;
  const maxAge = CACHE_CONFIG.persistence.maxAge;

  return {
    /**
     * Persist the client state to storage
     */
    persistClient: async (client: PersistedClient): Promise<void> => {
      try {
        const serialized = JSON.stringify(client);
        await storage.setItem(storageKey, serialized);
      } catch (error) {
        console.warn("[QueryPersister] Failed to persist client:", error);
        // Fail silently - persistence is a nice-to-have, not critical
      }
    },

    /**
     * Restore the client state from storage
     */
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const serialized = await storage.getItem(storageKey);
        if (!serialized) {
          return undefined;
        }

        const client = JSON.parse(serialized) as PersistedClient;

        // Check if the persisted cache has expired
        const persistedAt = client.timestamp;
        const now = Date.now();
        if (now - persistedAt > maxAge) {
          // Cache is too old, discard it
          await storage.removeItem(storageKey);
          return undefined;
        }

        return client;
      } catch (error) {
        console.warn("[QueryPersister] Failed to restore client:", error);
        // If restoration fails, start fresh
        return undefined;
      }
    },

    /**
     * Remove the persisted client state
     */
    removeClient: async (): Promise<void> => {
      try {
        await storage.removeItem(storageKey);
      } catch (error) {
        console.warn("[QueryPersister] Failed to remove client:", error);
      }
    },
  };
};

/**
 * Export the storage adapter for potential direct use
 */
export { storage };

/**
 * Utility to clear all query cache from storage
 * Useful for logout or cache reset scenarios
 */
export const clearQueryCache = async (): Promise<void> => {
  try {
    await storage.removeItem(CACHE_CONFIG.persistence.storageKey);
  } catch (error) {
    console.warn("[QueryPersister] Failed to clear cache:", error);
  }
};

/**
 * Get cache metadata (for debugging/status display)
 */
export const getCacheMetadata = async (): Promise<{
  exists: boolean;
  timestamp?: number;
  age?: number;
  isExpired?: boolean;
} | null> => {
  try {
    const serialized = await storage.getItem(CACHE_CONFIG.persistence.storageKey);
    if (!serialized) {
      return { exists: false };
    }

    const client = JSON.parse(serialized) as PersistedClient;
    const now = Date.now();
    const age = now - client.timestamp;

    return {
      exists: true,
      timestamp: client.timestamp,
      age,
      isExpired: age > CACHE_CONFIG.persistence.maxAge,
    };
  } catch (error) {
    console.warn("[QueryPersister] Failed to get cache metadata:", error);
    return null;
  }
};
