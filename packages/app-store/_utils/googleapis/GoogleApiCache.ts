import { createHash } from "crypto";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["GoogleApiCache"] });

interface CacheEntry {
  response: unknown;
  timestamp: number;
  requestSignature: string;
}

export interface CacheConfig {
  cacheWindowMs: number;
  maxCacheEntries: number;
  enableLogging: boolean;
}

export class GoogleApiCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private credentialId: number;

  constructor(credentialId: number, config: Partial<CacheConfig> = {}) {
    this.credentialId = credentialId;
    this.config = {
      cacheWindowMs: 30000,
      maxCacheEntries: 1000,
      enableLogging: true,
      ...config,
    };
  }

  private generateRequestSignature(method: string, params: unknown): string {
    const normalizedParams = this.normalizeParams(params);
    const signatureData = `${method}:${JSON.stringify(normalizedParams)}`;
    return createHash("sha256").update(signatureData).digest("hex");
  }

  private normalizeParams(params: unknown): unknown {
    if (!params) return {};

    const {
      requestId: _requestId,
      quotaUser: _quotaUser,
      ...normalizedParams
    } = params as Record<string, unknown>;

    if (typeof normalizedParams === "object" && normalizedParams !== null) {
      const sorted: Record<string, unknown> = {};
      Object.keys(normalizedParams)
        .sort()
        .forEach((key) => {
          sorted[key] = normalizedParams[key];
        });
      return sorted;
    }

    return normalizedParams;
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > this.config.cacheWindowMs) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (this.cache.size > this.config.maxCacheEntries) {
      const entriesToDelete = this.cache.size - this.config.maxCacheEntries;
      const entries = Array.from(this.cache.entries());

      const oldestKeys = entries
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, entriesToDelete)
        .map(([key]) => key);

      oldestKeys.forEach((key) => this.cache.delete(key));
    }
  }

  public async dedupe<T>(method: string, params: unknown, apiCall: () => Promise<T>): Promise<T> {
    this.cleanExpiredEntries();

    const requestSignature = this.generateRequestSignature(method, params);
    const cacheKey = `${this.credentialId}:${requestSignature}`;

    const cached = this.cache.get(cacheKey);
    if (cached) {
      if (this.config.enableLogging) {
        log.debug(
          "[Cache Hit] Returning cached response",
          safeStringify({
            method,
            credentialId: this.credentialId,
            cacheAge: Date.now() - cached.timestamp,
          })
        );
      }
      return cached.response;
    }

    if (this.config.enableLogging) {
      log.debug(
        "[Cache Miss] Making API call",
        safeStringify({
          method,
          credentialId: this.credentialId,
        })
      );
    }

    const response = await apiCall();

    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      requestSignature,
    });

    return response;
  }

  public getCacheStats() {
    return {
      size: this.cache.size,
      credentialId: this.credentialId,
      config: this.config,
    };
  }
}
