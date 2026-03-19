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

import { CloudflareKVAdapter } from "../CloudflareKVAdapter";
import { MemoryKVAdapter } from "../MemoryKVAdapter";
import { NoOpKVAdapter } from "../NoOpKVAdapter";
import { RedisKVAdapter } from "../RedisKVAdapter";
import { UpstashKVAdapter } from "../UpstashKVAdapter";
import { createKVAdapter } from "../createKVAdapter";

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
