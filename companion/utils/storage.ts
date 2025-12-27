/// <reference types="chrome" />

/**
 * Unified Storage Adapter
 *
 * Cross-platform storage abstraction that works with:
 * - SecureStore for React Native (iOS/Android) - for sensitive data
 * - AsyncStorage for React Native (iOS/Android) - for general data
 * - chrome.storage for browser extensions
 * - localStorage as fallback for web
 *
 * This is the single source of truth for storage operations across the app.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Check if chrome.storage is available (browser extension context)
 */
export const isChromeStorageAvailable = (): boolean => {
  return (
    Platform.OS === "web" &&
    typeof chrome !== "undefined" &&
    chrome.storage !== undefined &&
    chrome.storage.local !== undefined
  );
};

/**
 * Storage interface for type safety
 */
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Secure storage for sensitive data (tokens, credentials)
 * Uses SecureStore on mobile, chrome.storage on extension, localStorage on web
 */
export const secureStorage = {
  get: async (key: string): Promise<string | null> => {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve((result[key] as string) ?? null);
          }
        });
      });
    }
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },

  set: async (key: string, value: string): Promise<void> => {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  remove: async (key: string): Promise<void> => {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },

  removeAll: async (keys: string[]): Promise<void> => {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    if (Platform.OS === "web") {
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      return;
    }
    await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  },
};

/**
 * General storage for non-sensitive data (cache, preferences)
 * Uses AsyncStorage on mobile, chrome.storage on extension, localStorage on web
 */
export const generalStorage: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve((result[key] as string) ?? null);
          }
        });
      });
    }
    if (Platform.OS === "web") {
      return Promise.resolve(localStorage.getItem(key));
    }
    return AsyncStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (isChromeStorageAvailable()) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};
