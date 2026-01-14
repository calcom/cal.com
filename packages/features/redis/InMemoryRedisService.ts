import type { IRedisService } from "./IRedisService";

interface StoredValue<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * In-memory implementation of IRedisService for unit testing.
 * Unlike NoopRedisService which does nothing, this actually stores data in memory.
 */
export class InMemoryRedisService implements IRedisService {
  private store: Map<string, StoredValue<unknown>> = new Map();
  private lists: Map<string, unknown[]> = new Map();

  async get<TData>(key: string): Promise<TData | null> {
    const stored = this.store.get(key);
    if (!stored) {
      return null;
    }

    if (stored.expiresAt !== null && Date.now() > stored.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return stored.value as TData;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key) || this.lists.has(key);
    this.store.delete(key);
    this.lists.delete(key);
    return existed ? 1 : 0;
  }

  async set<TData>(key: string, value: TData, opts?: { ttl?: number }): Promise<"OK" | TData | null> {
    const expiresAt = opts?.ttl ? Date.now() + opts.ttl : null;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async expire(key: string, seconds: number): Promise<0 | 1> {
    const stored = this.store.get(key);
    if (!stored) {
      return 0;
    }
    stored.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async lrange<TResult = string>(key: string, start: number, end: number): Promise<TResult[]> {
    const list = this.lists.get(key);
    if (!list) {
      return [];
    }

    const actualEnd = end === -1 ? list.length : end + 1;
    return list.slice(start, actualEnd) as TResult[];
  }

  async lpush<TData>(key: string, ...elements: TData[]): Promise<number> {
    let list = this.lists.get(key);
    if (!list) {
      list = [];
      this.lists.set(key, list);
    }
    list.unshift(...[...elements].reverse());
    return list.length;
  }

  clear(): void {
    this.store.clear();
    this.lists.clear();
  }
}
