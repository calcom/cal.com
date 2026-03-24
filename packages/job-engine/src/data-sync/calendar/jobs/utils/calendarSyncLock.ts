import { withLock } from "@calid/redis";

export class LockNotAcquiredError extends Error {
  readonly key: string;
  readonly maxWaitMs: number;

  constructor(params: { key: string; maxWaitMs: number }) {
    super(`Unable to acquire lock for key "${params.key}" within ${params.maxWaitMs}ms`);
    this.name = "LockNotAcquiredError";
    this.key = params.key;
    this.maxWaitMs = params.maxWaitMs;
  }
}

export interface CalendarSyncLockOptions {
  ttlMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
}

const DEFAULT_TTL_MS = 90 * 1000;

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const sanitizeKeyPart = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, "_");

export const buildCalendarSyncLockKey = (params: {
  provider: string;
  credentialId: number;
  providerCalendarId: string;
}): string => {
  return `lock:calendar_sync:${sanitizeKeyPart(params.provider.toLowerCase())}:${
    params.credentialId
  }:${sanitizeKeyPart(params.providerCalendarId)}`;
};

export const withCalendarSyncLock = async <T>(
  params: {
    provider: string;
    credentialId: number;
    providerCalendarId: string;
  },
  callback: () => Promise<T>,
  options: CalendarSyncLockOptions = {}
): Promise<T> => {
  const lockKey = buildCalendarSyncLockKey(params);
  const ttlMs = Math.max(60_000, Math.min(120_000, options.ttlMs ?? DEFAULT_TTL_MS));
  const maxRetries = Math.max(0, options.maxRetries ?? 7);
  const baseRetryDelayMs = Math.max(25, options.baseRetryDelayMs ?? 100);
  const maxRetryDelayMs = Math.max(baseRetryDelayMs, options.maxRetryDelayMs ?? 2_000);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const result = await withLock(lockKey, ttlMs, callback);
    if (result !== null) {
      return result;
    }

    if (attempt < maxRetries) {
      const delayMs = Math.min(maxRetryDelayMs, baseRetryDelayMs * 2 ** attempt);
      await sleep(delayMs);
    }
  }

  throw new LockNotAcquiredError({
    key: lockKey,
    maxWaitMs: baseRetryDelayMs * Math.max(1, maxRetries),
  });
};
