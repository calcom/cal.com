import { CloudflareKVAdapter } from "./cloudflare-kv-adapter";
import type { CloudflareKVConfig } from "./cloudflare-kv-adapter";
import type { KVAdapter } from "./kv-adapter";
import { MemoryKVAdapter } from "./memory-kv-adapter";
import { NoOpKVAdapter } from "./no-op-kv-adapter";
import { RedisKVAdapter } from "./redis-kv-adapter";
import type { RedisKVConfig } from "./redis-kv-adapter";
import { UpstashKVAdapter } from "./upstash-kv-adapter";
import type { UpstashKVConfig } from "./upstash-kv-adapter";

export type KVConfig =
  | ({ provider: "upstash" } & UpstashKVConfig)
  | ({ provider: "cloudflare" } & CloudflareKVConfig)
  | ({ provider: "redis" } & RedisKVConfig)
  | { provider: "memory" }
  | { provider: "noop" };

export function createKVAdapter(config: KVConfig): KVAdapter {
  switch (config.provider) {
    case "upstash":
      return new UpstashKVAdapter(config);
    case "cloudflare":
      return new CloudflareKVAdapter(config);
    case "redis":
      return new RedisKVAdapter(config);
    case "memory":
      return new MemoryKVAdapter();
    case "noop":
      return new NoOpKVAdapter();
  }
}
