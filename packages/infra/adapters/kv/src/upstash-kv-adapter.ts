import { Redis } from "@upstash/redis";

import type { KVAdapter } from "./kv-adapter";

export interface UpstashKVConfig {
  url: string;
  token: string;
}

export class UpstashKVAdapter implements KVAdapter {
  private client: Redis;

  constructor(config: UpstashKVConfig) {
    this.client = new Redis({ url: config.url, token: config.token });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get<string>(key);
  }

  async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
