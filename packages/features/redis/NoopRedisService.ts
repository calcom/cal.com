import type { IRedisService } from "./IRedisService";

/**
 * Noop implementation of IRedisService for testing or fallback scenarios.
 */

export class NoopRedisService implements IRedisService {
  async get<TData>(_key: string): Promise<TData | null> {
    return null;
  }

  async del(_key: string): Promise<number> {
    return 0;
  }

  async set<TData>(_key: string, _value: TData, _opts?: { ttl?: number }): Promise<"OK" | TData | null> {
    return "OK";
  }

  async expire(_key: string, _seconds: number): Promise<0 | 1> {
    // Implementation for setting expiration time for key in Redis
    return 0;
  }

  async lrange<TResult = string>(_key: string, _start: number, _end: number): Promise<TResult[]> {
    return [];
  }

  async lpush<TData>(_key: string, ..._elements: TData[]): Promise<number> {
    return 0;
  }
}
