import { describe, expect, test } from "vitest";
import { NoOpKVAdapter } from "../no-op-kv-adapter";

describe("NoOpKVAdapter", () => {
  const adapter = new NoOpKVAdapter();

  test("get always returns null", async () => {
    expect(await adapter.get("any-key")).toBeNull();
  });

  test("put completes without error", async () => {
    await expect(adapter.put("key", "value")).resolves.toBeUndefined();
  });

  test("put with ttlSeconds completes without error", async () => {
    await expect(adapter.put("key", "value", 60)).resolves.toBeUndefined();
  });

  test("delete completes without error", async () => {
    await expect(adapter.delete("key")).resolves.toBeUndefined();
  });
});
