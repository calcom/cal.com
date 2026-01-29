import type { AppMeta } from "@calcom/types/App";

import { appStoreMetadata as rawAppStoreMetadata } from "./apps.metadata.generated";
import { getNormalizedAppMetadata } from "./getNormalizedAppMetadata";

type RawAppStoreMetaData = typeof rawAppStoreMetadata;
type AppStoreMetaData = {
  [key in keyof RawAppStoreMetaData]: Omit<AppMeta, "dirName"> & { dirName: string };
};

const cache: Record<string, any> = {};

export const appStoreMetadata = new Proxy(rawAppStoreMetadata as any, {
  get(target, prop: string) {
    if (prop in cache) return cache[prop];

    const appInfo = (target as any)[prop];
    if (!appInfo) return undefined;

    if (typeof appInfo.fetch === "function") {
      // Lazy object from build.ts
      const { fetch: _, modulePath, ...staticMeta } = appInfo;

      // Wrap in another Proxy to handle access to non-static fields
      const lazyApp = new Proxy(staticMeta, {
        get(subTarget, subProp: string) {
          if (subProp in subTarget) return subTarget[subProp];

          // On server-side, we can use require to satisfy synchronous access to full metadata
          if (typeof window === "undefined") {
            try {
              // The modulePath is relative to the generated file in the same directory
              // biome-ignore lint/nursery/noVarRequires: Necessary for synchronous lazy load on server
              const fullMeta = require(`./${modulePath.replace(/^\.\//, "")}`);
              const raw = fullMeta.default || fullMeta.metadata || fullMeta;
              const normalized = getNormalizedAppMetadata(raw);
              Object.assign(subTarget, normalized);
              return (subTarget as any)[subProp];
            } catch (_e) {
              // Fallback to undefined if sync load fails
            }
          }
          return undefined;
        },
      });

      cache[prop] = lazyApp;
      return lazyApp;
    }

    // Fallback for already normalized items or public/E2E stubs
    return appInfo;
  },
  getOwnPropertyDescriptor(target, prop) {
    if ((target as any)[prop]) {
      return { enumerable: true, configurable: true };
    }
    return undefined;
  },
  ownKeys(target) {
    return Object.keys(target);
  },
});
