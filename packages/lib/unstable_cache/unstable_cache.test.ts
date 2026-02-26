import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache:
    (fn: (...args: unknown[]) => Promise<unknown>, _keys?: string[], _opts?: Record<string, unknown>) =>
    (...args: unknown[]) =>
      fn(...args),
}));

vi.mock("superjson", () => ({
  stringify: vi.fn((val: unknown) => JSON.stringify(val)),
  parse: vi.fn((val: string) => JSON.parse(val)),
}));

import { cache } from "./unstable_cache";

describe("cache", () => {
  it("calls underlying function with correct arguments", async () => {
    const fn = vi.fn().mockResolvedValue({ data: "test" });
    const cached = cache(fn, ["key1"], { revalidate: 60 });
    await cached("arg1", "arg2");
    expect(fn).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("returns a function that can be called", () => {
    const fn = vi.fn().mockResolvedValue("result");
    const cached = cache(fn, ["my-key"], { revalidate: 30 });
    expect(typeof cached).toBe("function");
  });

  it("wraps the original function preserving its behavior", async () => {
    const fn = vi.fn().mockResolvedValue("original-result");
    const cached = cache(fn, ["key"], { revalidate: 120 });
    const result = await cached();
    expect(result).toBe("original-result");
  });

  it("returns deserialized result", async () => {
    const fn = vi.fn().mockResolvedValue({ name: "Alice", count: 42 });
    const cached = cache(fn, ["key"], {});
    const result = await cached();
    expect(result).toEqual({ name: "Alice", count: 42 });
  });

  it("serializes result through superjson stringify", async () => {
    const { stringify } = await import("superjson");
    const fn = vi.fn().mockResolvedValue({ value: true });
    const cached = cache(fn, ["key"], {});
    await cached();
    expect(stringify).toHaveBeenCalledWith({ value: true });
  });

  it("deserializes result through superjson parse", async () => {
    const { parse } = await import("superjson");
    const fn = vi.fn().mockResolvedValue("hello");
    const cached = cache(fn, ["key"], {});
    await cached();
    expect(parse).toHaveBeenCalled();
  });

  it("handles null results", async () => {
    const fn = vi.fn().mockResolvedValue(null);
    const cached = cache(fn, ["key"], {});
    const result = await cached();
    expect(result).toBeNull();
  });

  it("handles array results", async () => {
    const fn = vi.fn().mockResolvedValue([1, 2, 3]);
    const cached = cache(fn, ["key"], {});
    const result = await cached();
    expect(result).toEqual([1, 2, 3]);
  });
});
