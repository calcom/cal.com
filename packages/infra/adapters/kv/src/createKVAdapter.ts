import { CloudflareKVAdapter } from "./CloudflareKVAdapter";
import type { CloudflareKVConfig } from "./CloudflareKVAdapter";
import type { KVAdapter } from "./KVAdapter";
import { MemoryKVAdapter } from "./MemoryKVAdapter";
import { NoOpKVAdapter } from "./NoOpKVAdapter";
import { RedisKVAdapter } from "./RedisKVAdapter";
import type { RedisKVConfig } from "./RedisKVAdapter";
import { UpstashKVAdapter } from "./UpstashKVAdapter";
import type { UpstashKVConfig } from "./UpstashKVAdapter";

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
