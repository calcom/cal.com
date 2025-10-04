import type { AppMeta } from "@calcom/types/App";

import { getNormalizedAppMetadata } from "./getNormalizedAppMetadata";

// Create a cache for loaded metadata
const metadataCache = new Map<string, AppMeta>();

// Async function to get metadata by dynamically importing
export async function getAppMetadata(dirName: string): Promise<AppMeta | null> {
  if (metadataCache.has(dirName)) {
    return metadataCache.get(dirName)!;
  }

  try {
    // Try to import config.json first
    const configModule = await import(`./${dirName}/config.json`);
    const normalized = getNormalizedAppMetadata(configModule.default);
    metadataCache.set(dirName, normalized);
    return normalized;
  } catch {
    try {
      // Fallback to _metadata.ts
      const metadataModule = await import(`./${dirName}/_metadata`);
      const normalized = getNormalizedAppMetadata(metadataModule.metadata);
      metadataCache.set(dirName, normalized);
      return normalized;
    } catch {
      return null;
    }
  }
}

// Keep the old synchronous interface for backward compatibility
// But make it throw an error to encourage migration to async
export const appStoreMetadata = new Proxy({} as any, {
  get(target, prop: string) {
    throw new Error(`appStoreMetadata is no longer synchronous. Use getAppMetadata('${prop}') instead.`);
  },
});
