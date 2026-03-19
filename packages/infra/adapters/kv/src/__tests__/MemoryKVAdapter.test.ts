import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MemoryKVAdapter } from "../MemoryKVAdapter";

describe("MemoryKVAdapter", () => {
  let adapter: MemoryKVAdapter;

  beforeEach(() => {
    vi.useFakeTimers();
    adapter = new MemoryKVAdapter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("get/put", () => {
    test("returns null for missing key", async () => {
      expect(await adapter.get("missing")).toBeNull();
    });

    test("stores and retrieves a value", async () => {
      await adapter.put("key", "value");
      expect(await adapter.get("key")).toBe("value");
    });

    test("overwrites existing value", async () => {
      await adapter.put("key", "first");
      await adapter.put("key", "second");
      expect(await adapter.get("key")).toBe("second");
    });
  });

  describe("TTL", () => {
    test("returns value before TTL expires", async () => {
      await adapter.put("key", "value", 60);

      vi.advanceTimersByTime(59_000);
      expect(await adapter.get("key")).toBe("value");
    });

    test("returns null after TTL expires", async () => {
      await adapter.put("key", "value", 60);

      vi.advanceTimersByTime(60_000);
      expect(await adapter.get("key")).toBeNull();
    });

    test("evicts expired entry from store on get", async () => {
      await adapter.put("key", "value", 1);
      expect(adapter.size).toBe(1);

      vi.advanceTimersByTime(1_000);
      await adapter.get("key");
      expect(adapter.size).toBe(0);
    });

    test("value without TTL never expires", async () => {
      await adapter.put("key", "value");

      vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000);
      expect(await adapter.get("key")).toBe("value");
    });
  });

  describe("delete", () => {
    test("removes an existing key", async () => {
      await adapter.put("key", "value");
      await adapter.delete("key");
      expect(await adapter.get("key")).toBeNull();
    });

    test("does nothing for missing key", async () => {
      await expect(adapter.delete("missing")).resolves.toBeUndefined();
    });
  });

  describe("clear", () => {
    test("removes all entries", async () => {
      await adapter.put("a", "1");
      await adapter.put("b", "2");
      adapter.clear();
      expect(adapter.size).toBe(0);
      expect(await adapter.get("a")).toBeNull();
    });
  });
});
