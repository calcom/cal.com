import { describe, expect, it } from "vitest";

import objectKeys from "./objectKeys";

describe("objectKeys", () => {
  it("returns keys of a plain object", () => {
    const keys = objectKeys({ a: 1, b: 2, c: 3 });
    expect(keys).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty object", () => {
    expect(objectKeys({})).toEqual([]);
  });

  it("returns string keys (not symbol keys)", () => {
    const obj = { x: 1, y: 2 };
    const keys = objectKeys(obj);
    keys.forEach((key) => {
      expect(typeof key).toBe("string");
    });
  });

  it("returns keys with correct type narrowing", () => {
    const obj = { name: "Alice", age: 30 };
    const keys = objectKeys(obj);
    // Each key should be assignable to "name" | "age"
    keys.forEach((key) => {
      expect(["name", "age"]).toContain(key);
    });
  });

  it("works with single-key objects", () => {
    expect(objectKeys({ only: true })).toEqual(["only"]);
  });

  it("returns keys for an object with mixed value types", () => {
    const obj = { name: "test", count: 42, active: true };
    expect(objectKeys(obj)).toEqual(["name", "count", "active"]);
  });

  it("returns keys for nested objects without descending", () => {
    const obj = { a: { nested: true }, b: [1, 2] };
    expect(objectKeys(obj)).toEqual(["a", "b"]);
  });
});
