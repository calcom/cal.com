type CacheEntry<T> = {
  value: T;
  expiry: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Set a value in the cache with an expiration time
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds
 */
export function setCache<T>(key: string, value: T, ttlSeconds: number): void {
  const expiry = Date.now() + ttlSeconds * 1000;
  cache.set(key, { value, expiry });
}

/**
 * Get a value from the cache
 * @param key - Cache key
 * @returns The cached value or null if not found or expired
 */
export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Delete a value from the cache
 * @param key - Cache key
 */
export function deleteCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cached values
 */
export function clearCache(): void {
  cache.clear();
}
