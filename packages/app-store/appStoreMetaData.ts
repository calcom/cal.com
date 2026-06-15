import type { AppMeta } from "@calcom/types/App";

import { getNormalizedAppMetadata } from "./getNormalizedAppMetadata";

type AppStoreMetaData = Record<string, Omit<AppMeta, "dirName"> & { dirName: string }>;

/**
 * Lazy-loads app store metadata from the generated file.
 * The raw metadata (config.json / _metadata.ts) is loaded on first access,
 * avoiding eager loading of ~100+ metadata files at module import time.
 */
let _loaded = false;
const _normalizedCache: AppStoreMetaData = {} as AppStoreMetaData;

function ensureMetadataLoaded() {
  if (_loaded) return;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { appStoreMetadata: raw } = require("./apps.metadata.generated");
  for (const [key, value] of Object.entries(raw)) {
    _normalizedCache[key] = getNormalizedAppMetadata(value) as AppStoreMetaData[string];
  }
  _loaded = true;
}

export const appStoreMetadata = new Proxy(_normalizedCache as AppStoreMetaData, {
  get(target, key: string) {
    if (key === "then" || key === "__esModule") return undefined;
    ensureMetadataLoaded();
    return target[key];
  },
  ownKeys() {
    ensureMetadataLoaded();
    return Reflect.ownKeys(_normalizedCache);
  },
  getOwnPropertyDescriptor(_target, key) {
    ensureMetadataLoaded();
    return Reflect.getOwnPropertyDescriptor(_normalizedCache, key);
  },
});
