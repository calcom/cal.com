import { type RedisClientType, createClient } from "redis";

import type { KVAdapter } from "./KVAdapter";

export interface RedisKVConfig {
  url: string;
}

export class RedisKVAdapter implements KVAdapter {
  private client: RedisClientType;
  private connected: Promise<void>;

  constructor(config: RedisKVConfig) {
    this.client = createClient({ url: config.url });
    this.connected = this.client.connect().then(() => undefined);
  }

  async get(key: string): Promise<string | null> {
    await this.connected;
    return this.client.get(key);
  }

  async put(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.connected;
    if (ttlSeconds) {
      await this.client.set(key, value, { EX: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.connected;
    await this.client.del(key);
  }
}
