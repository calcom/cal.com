import type { AppMeta } from "@calcom/types/App";

import { getNormalizedAppMetadata } from "./getNormalizedAppMetadata";

// Cache for loaded metadata
const metadataCache = new Map<string, Omit<AppMeta, "dirName"> & { dirName: string }>();

// Truly lazy loading - only load when requested
export const appStoreMetadata: Record<string, () => Promise<Omit<AppMeta, "dirName"> & { dirName: string }>> = new Proxy({}, {
  get(target, key: string) {
    if (typeof key !== 'string') return undefined;

    // Return cached version if available
    if (metadataCache.has(key)) {
      return async () => metadataCache.get(key)!;
    }

    // Create lazy loader for this specific key
    return async () => {
      // Check cache again in case it was loaded while we were waiting
      if (metadataCache.has(key)) {
        return metadataCache.get(key)!;
      }

      try {
        // Dynamic import based on the key
        let rawMetadata;

        if (key.includes('_metadata')) {
          // This is a _metadata.ts file
          const module = await import(`./${key}`);
          rawMetadata = module.metadata;
        } else {
          // This is a config.json file
          rawMetadata = await import(`./${key}/config.json`);
        }

        const normalizedMetadata = getNormalizedAppMetadata(rawMetadata);
        metadataCache.set(key, normalizedMetadata);
        return normalizedMetadata;
      } catch (error) {
        console.warn(`Failed to load metadata for ${key}:`, error);
        return null;
      }
    };
  }
});
