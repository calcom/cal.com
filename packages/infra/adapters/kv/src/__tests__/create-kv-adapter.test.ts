import { describe, expect, test, vi } from "vitest";

vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn(),
  })),
}));

vi.mock("@upstash/redis", () => {
  return {
    Redis: class MockUpstashRedis {
      get = vi.fn();
      set = vi.fn();
      del = vi.fn();
    },
  };
});

import { CloudflareKVAdapter } from "../cloudflare-kv-adapter";
import { MemoryKVAdapter } from "../memory-kv-adapter";
import { NoOpKVAdapter } from "../no-op-kv-adapter";
import { RedisKVAdapter } from "../redis-kv-adapter";
import { UpstashKVAdapter } from "../upstash-kv-adapter";
import { createKVAdapter } from "../create-kv-adapter";

describe("createKVAdapter", () => {
  test("creates UpstashKVAdapter for provider upstash", () => {
    const adapter = createKVAdapter({
      provider: "upstash",
      url: "https://my-redis.upstash.io",
      token: "tok",
    });
    expect(adapter).toBeInstanceOf(UpstashKVAdapter);
  });

  test("creates CloudflareKVAdapter for provider cloudflare", () => {
    const adapter = createKVAdapter({
      provider: "cloudflare",
      accountId: "acc",
      namespaceId: "ns",
      apiToken: "tok",
    });
    expect(adapter).toBeInstanceOf(CloudflareKVAdapter);
  });

  test("creates RedisKVAdapter for provider redis", () => {
    const adapter = createKVAdapter({
      provider: "redis",
      url: "redis://localhost:6379",
    });
    expect(adapter).toBeInstanceOf(RedisKVAdapter);
  });

  test("creates MemoryKVAdapter for provider memory", () => {
    const adapter = createKVAdapter({ provider: "memory" });
    expect(adapter).toBeInstanceOf(MemoryKVAdapter);
  });

  test("creates NoOpKVAdapter for provider noop", () => {
    const adapter = createKVAdapter({ provider: "noop" });
    expect(adapter).toBeInstanceOf(NoOpKVAdapter);
  });
});
