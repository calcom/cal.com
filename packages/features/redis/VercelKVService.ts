import { kv } from "@vercel/kv";

import type { IRedisService } from "./IRedisService";

export class VercelKVService implements IRedisService {
  async get<TData>(key: string): Promise<TData | null> {
    return kv.get(key);
  }

  async del(key: string): Promise<number> {
    const result = await kv.del(key);
    return result;
  }

  async set<TData>(key: string, value: TData): Promise<"OK" | TData | null> {
    await kv.set(key, value);
    return "OK";
  }

  async expire(key: string, seconds: number): Promise<0 | 1> {
    const result = await kv.expire(key, seconds);
    return result ? 1 : 0;
  }

  async lrange<TResult = string>(key: string, start: number, end: number): Promise<TResult[]> {
    return kv.lrange(key, start, end);
  }

  async lpush<TData>(key: string, ...elements: TData[]): Promise<number> {
    return kv.lpush(key, ...elements);
  }
}
