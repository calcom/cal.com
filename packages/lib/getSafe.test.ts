import { describe, expect, it } from "vitest";
import { getSafe } from "./getSafe";

describe("getSafe", () => {
  it("returns value at a simple path", () => {
    expect(getSafe<number>({ a: 1 }, ["a"])).toBe(1);
  });

  it("returns value at a nested path", () => {
    expect(getSafe<string>({ a: { b: { c: "deep" } } }, ["a", "b", "c"])).toBe("deep");
  });

  it("returns undefined for missing key", () => {
    expect(getSafe({ a: 1 }, ["b"])).toBeUndefined();
  });

  it("returns undefined for path through non-object", () => {
    expect(getSafe({ a: "string" }, ["a", "b"])).toBeUndefined();
  });

  it("returns undefined for null intermediate", () => {
    expect(getSafe({ a: null }, ["a", "b"])).toBeUndefined();
  });

  it("handles array index access", () => {
    expect(getSafe<string>({ items: ["zero", "one", "two"] }, ["items", 1])).toBe("one");
  });

  it("returns the root object for empty path", () => {
    const obj = { a: 1 };
    expect(getSafe(obj, [])).toEqual(obj);
  });

  it("returns undefined when root is null", () => {
    expect(getSafe(null, ["a"])).toBeUndefined();
  });
});
