import crypto from "crypto";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["GoogleApiCache"] });

export interface CacheConfig {
  cacheWindowMs: number;
  maxCacheEntries: number;
  enableLogging: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  signature: string;
}

export class GoogleApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private credentialId: number;
  private config: CacheConfig;

  constructor(credentialId: number, config: Partial<CacheConfig> = {}) {
    this.credentialId = credentialId;
    this.config = {
      cacheWindowMs: 30000, // 30 seconds default
      maxCacheEntries: 1000,
      enableLogging: true,
      ...config,
    };
  }

  private generateRequestSignature(method: string, params: any): string {
    const normalizedParams = this.normalizeParams(params);
    const signatureData = {
      method,
      params: normalizedParams,
      credentialId: this.credentialId,
    };
    return crypto.createHash("sha256").update(JSON.stringify(signatureData)).digest("hex");
  }

  private normalizeParams(params: any): any {
    if (!params || typeof params !== "object") return params;

    const normalized = { ...params };

    delete normalized.requestId;
    delete normalized.quotaUser;
    delete normalized._timestamp;

    if (typeof normalized === "object" && normalized !== null) {
      const sortedKeys = Object.keys(normalized).sort();
      const sortedObj: any = {};
      for (const key of sortedKeys) {
        sortedObj[key] = this.normalizeParams(normalized[key]);
      }
      return sortedObj;
    }

    return normalized;
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > this.config.cacheWindowMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    if (this.config.enableLogging && expiredKeys.length > 0) {
      log.debug(
        "Cleaned expired cache entries",
        safeStringify({
          credentialId: this.credentialId,
          expiredCount: expiredKeys.length,
          remainingCount: this.cache.size,
        })
      );
    }
  }

  private enforceMaxEntries(): void {
    if (this.cache.size <= this.config.maxCacheEntries) return;

    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.slice(0, this.cache.size - this.config.maxCacheEntries);
    for (const [key] of entriesToRemove) {
      this.cache.delete(key);
    }

    if (this.config.enableLogging) {
      log.debug(
        "Enforced max cache entries",
        safeStringify({
          credentialId: this.credentialId,
          removedCount: entriesToRemove.length,
          currentSize: this.cache.size,
        })
      );
    }
  }

  async dedupe<T>(method: string, params: any, originalFetch: () => Promise<T>): Promise<T> {
    const signature = this.generateRequestSignature(method, params);
    const now = Date.now();

    this.cleanExpiredEntries();

    const cachedEntry = this.cache.get(signature);
    if (cachedEntry && now - cachedEntry.timestamp <= this.config.cacheWindowMs) {
      if (this.config.enableLogging) {
        log.debug(
          "Cache hit",
          safeStringify({
            credentialId: this.credentialId,
            method,
            signature: signature.substring(0, 8),
            age: now - cachedEntry.timestamp,
          })
        );
      }
      return cachedEntry.data;
    }

    if (this.config.enableLogging) {
      log.debug(
        "Cache miss",
        safeStringify({
          credentialId: this.credentialId,
          method,
          signature: signature.substring(0, 8),
          reason: cachedEntry ? "expired" : "not_found",
        })
      );
    }

    try {
      const result = await originalFetch();

      this.cache.set(signature, {
        data: result,
        timestamp: now,
        signature,
      });

      this.enforceMaxEntries();

      return result;
    } catch (error) {
      if (this.config.enableLogging) {
        log.warn(
          "API call failed",
          safeStringify({
            credentialId: this.credentialId,
            method,
            error: error instanceof Error ? error.message : String(error),
          })
        );
      }
      throw error;
    }
  }

  getCacheStats(): { size: number; credentialId: number; config: CacheConfig } {
    return {
      size: this.cache.size,
      credentialId: this.credentialId,
      config: this.config,
    };
  }

  clearCache(): void {
    this.cache.clear();
    if (this.config.enableLogging) {
      log.debug("Cache cleared", safeStringify({ credentialId: this.credentialId }));
    }
  }
}
