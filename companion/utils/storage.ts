/**
 * Cross-platform storage utility
 * Works on Web, iOS, and Android without additional dependencies
 */

import { Platform } from 'react-native';

// Simple storage implementation that works everywhere
class SimpleStorage {
  private memoryStore: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      // For native, use in-memory storage (tokens will persist during app session)
      // In production, you'd want to use a proper native storage solution
      return this.memoryStore.get(key) || null;
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      } else {
        // For native, use in-memory storage
        this.memoryStore.set(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      } else {
        this.memoryStore.delete(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }
}

export const storage = new SimpleStorage();

