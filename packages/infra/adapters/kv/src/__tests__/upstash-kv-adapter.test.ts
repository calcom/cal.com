import { beforeEach, describe, expect, test, vi } from "vitest";

const { mockGet, mockSet, mockDel, MockRedis } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockDel = vi.fn();

  class MockRedis {
    static lastConfig: { url: string; token: string };
    constructor(config: { url: string; token: string }) {
      MockRedis.lastConfig = config;
    }
    get = mockGet;
    set = mockSet;
    del = mockDel;
  }

  return { mockGet, mockSet, mockDel, MockRedis };
});

vi.mock("@upstash/redis", () => ({ Redis: MockRedis }));

import { UpstashKVAdapter } from "../upstash-kv-adapter";

const MOCK_CONFIG = {
  url: "https://my-redis.upstash.io",
  token: "test-redis-token",
};

describe("UpstashKVAdapter", () => {
  let adapter: UpstashKVAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new UpstashKVAdapter(MOCK_CONFIG);
  });

  test("creates Upstash Redis client with provided config", () => {
    expect(MockRedis.lastConfig).toEqual({ url: MOCK_CONFIG.url, token: MOCK_CONFIG.token });
  });

  describe("get", () => {
    test("delegates to client.get", async () => {
      mockGet.mockResolvedValue("cached-value");

      const result = await adapter.get("my-key");

      expect(result).toBe("cached-value");
      expect(mockGet).toHaveBeenCalledWith("my-key");
    });

    test("returns null for missing key", async () => {
      mockGet.mockResolvedValue(null);

      const result = await adapter.get("missing");

      expect(result).toBeNull();
    });
  });

  describe("put", () => {
    test("calls set without TTL when ttlSeconds is omitted", async () => {
      mockSet.mockResolvedValue("OK");

      await adapter.put("my-key", "my-value");

      expect(mockSet).toHaveBeenCalledWith("my-key", "my-value");
    });

    test("calls set with ex when ttlSeconds is provided", async () => {
      mockSet.mockResolvedValue("OK");

      await adapter.put("my-key", "my-value", 300);

      expect(mockSet).toHaveBeenCalledWith("my-key", "my-value", { ex: 300 });
    });
  });

  describe("delete", () => {
    test("delegates to client.del", async () => {
      mockDel.mockResolvedValue(1);

      await adapter.delete("my-key");

      expect(mockDel).toHaveBeenCalledWith("my-key");
    });
  });
});
