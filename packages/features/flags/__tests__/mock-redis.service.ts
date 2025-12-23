import type { IRedisService } from "../../redis/IRedisService";

/**
 * In-memory mock Redis service for testing cache behavior.
 * Tracks all operations for verification.
 */
export class MockRedisService implements IRedisService {
  private store = new Map<string, unknown>();

  getCalls: string[] = [];
  setCalls: Array<{ key: string; value: unknown; ttl?: number }> = [];
  delCalls: string[] = [];

  async get<TData>(key: string): Promise<TData | null> {
    this.getCalls.push(key);
    const value = this.store.get(key);
    return value !== undefined ? (value as TData) : null;
  }

  async set<TData>(key: string, value: TData, opts?: { ttl?: number }): Promise<"OK"> {
    this.setCalls.push({ key, value, ttl: opts?.ttl });
    this.store.set(key, value);
    return "OK";
  }

  async del(key: string): Promise<number> {
    this.delCalls.push(key);
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async expire(_key: string, _seconds: number): Promise<0 | 1> {
    return 0;
  }

  async lrange<TResult = string>(_key: string, _start: number, _end: number): Promise<TResult[]> {
    return [];
  }

  async lpush<TData>(_key: string, ..._elements: TData[]): Promise<number> {
    return 0;
  }

  setStoreValue(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  reset(): void {
    this.store.clear();
    this.getCalls = [];
    this.setCalls = [];
    this.delCalls = [];
  }
}
