import { describe, expect, it } from "vitest";
import { objectKeys } from "./objectKeys";

describe("objectKeys", () => {
  it("returns keys of a simple object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(objectKeys(obj)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for an empty object", () => {
    expect(objectKeys({})).toEqual([]);
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
