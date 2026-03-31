import { beforeEach, describe, expect, test, vi } from "vitest";

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockConnect = vi.fn().mockResolvedValue(undefined);

vi.mock("redis", () => {
  return {
    createClient: vi.fn((opts: { url: string }) => ({
      url: opts.url,
      connect: mockConnect,
      get: mockGet,
      set: mockSet,
      del: mockDel,
    })),
  };
});

import { createClient } from "redis";
import { RedisKVAdapter } from "../redis-kv-adapter";

describe("RedisKVAdapter", () => {
  let adapter: RedisKVAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    adapter = new RedisKVAdapter({ url: "redis://localhost:6379" });
  });

  test("creates redis client with provided URL", () => {
    expect(createClient).toHaveBeenCalledWith({ url: "redis://localhost:6379" });
  });

  test("connects on construction", () => {
    expect(mockConnect).toHaveBeenCalled();
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

    test("calls set with EX when ttlSeconds is provided", async () => {
      mockSet.mockResolvedValue("OK");

      await adapter.put("my-key", "my-value", 300);

      expect(mockSet).toHaveBeenCalledWith("my-key", "my-value", { EX: 300 });
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
