import { describe, expect, it } from "vitest";

import { getSafe } from "./getSafe";

describe("getSafe", () => {
  it("retrieves a top-level property", () => {
    expect(getSafe<string>({ name: "Alice" }, ["name"])).toBe("Alice");
  });

  it("retrieves a nested property", () => {
    const obj = { a: { b: { c: 42 } } };
    expect(getSafe<number>(obj, ["a", "b", "c"])).toBe(42);
  });

  it("returns undefined for missing path", () => {
    expect(getSafe({ a: 1 }, ["b"])).toBeUndefined();
  });

  it("returns undefined when traversing through a non-object", () => {
    expect(getSafe({ a: "string" }, ["a", "b"])).toBeUndefined();
  });

  it("returns undefined for null intermediate", () => {
    expect(getSafe({ a: null }, ["a", "b"])).toBeUndefined();
  });

  it("handles array index access with numeric keys", () => {
    const obj = { items: ["zero", "one", "two"] };
    expect(getSafe<string>(obj, ["items", 1])).toBe("one");
  });

  it("returns the root object for empty path", () => {
    const obj = { a: 1 };
    expect(getSafe(obj, [])).toEqual({ a: 1 });
  });

  it("returns undefined when starting from null", () => {
    expect(getSafe(null, ["a"])).toBeUndefined();
  });

  it("returns undefined when starting from undefined", () => {
    expect(getSafe(undefined, ["a"])).toBeUndefined();
  });

  it("returns undefined when starting from a primitive", () => {
    expect(getSafe(42, ["a"])).toBeUndefined();
  });
});
