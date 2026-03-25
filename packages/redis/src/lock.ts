import { randomUUID } from "node:crypto";

import { getRedisConnection } from "./redis";

const RELEASE_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

const LOCK_TOKEN_HASH_KEY = `lock:token_store:${process.pid}`;

const toPositiveTtl = (ttlMs: number): number => {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    return 1000;
  }
  return Math.floor(ttlMs);
};

export const acquireLock = async (key: string, ttlMs: number): Promise<boolean> => {
  const redis = getRedisConnection();
  const token = randomUUID();
  const ttl = toPositiveTtl(ttlMs);

  try {
    const acquired = await redis.set(key, token, "PX", ttl, "NX");
    if (acquired !== "OK") {
      return false;
    }

    await redis.hset(LOCK_TOKEN_HASH_KEY, key, token);
    await redis.pexpire(LOCK_TOKEN_HASH_KEY, Math.max(ttl * 2, 60_000));
    return true;
  } catch {
    return false;
  }
};

export const releaseLock = async (key: string): Promise<void> => {
  const redis = getRedisConnection();

  try {
    const token = await redis.hget(LOCK_TOKEN_HASH_KEY, key);
    if (!token || typeof token !== "string") {
      return;
    }

    await redis.eval(RELEASE_IF_OWNER_SCRIPT, 1, key, token);
    await redis.hdel(LOCK_TOKEN_HASH_KEY, key);
  } catch {
    // Best effort release.
  }
};

export const withLock = async <T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> => {
  const acquired = await acquireLock(key, ttlMs);
  if (!acquired) {
    return null;
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key);
  }
};

export const acquireDebounceLock = async (key: string, ttlMs: number): Promise<boolean> => {
  const redis = getRedisConnection();
  const ttl = toPositiveTtl(ttlMs);
  const token = randomUUID();

  try {
    const acquired = await redis.set(key, token, "PX", ttl, "NX");
    return acquired === "OK";
  } catch {
    return false;
  }
};
