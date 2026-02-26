import { describe, expect, it } from "vitest";

import { safeStringify } from "./safeStringify";

describe("safeStringify", () => {
  it("stringifies a plain object", () => {
    const result = safeStringify({ key: "value" });
    expect(result).toBe('{"key":"value"}');
  });

  it("stringifies a string", () => {
    const result = safeStringify("hello");
    expect(result).toBe('"hello"');
  });

  it("stringifies a number", () => {
    const result = safeStringify(42);
    expect(result).toBe("42");
  });

  it("stringifies null", () => {
    const result = safeStringify(null);
    expect(result).toBe("null");
  });

  it("stringifies an array", () => {
    const result = safeStringify([1, 2, 3]);
    expect(result).toBe("[1,2,3]");
  });

  it("extracts stack from Error objects", () => {
    const error = new Error("test error");
    const result = safeStringify(error);
    // Should be a JSON string containing the stack trace
    expect(typeof result).toBe("string");
    const parsed = JSON.parse(result as string);
    expect(parsed).toContain("test error");
  });

  it("extracts message from Error when stack is undefined", () => {
    const error = new Error("no stack");
    error.stack = undefined;
    const result = safeStringify(error);
    const parsed = JSON.parse(result as string);
    expect(parsed).toBe("no stack");
  });

  it("returns the original object on circular reference", () => {
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    const result = safeStringify(circular);
    // JSON.stringify throws on circular, so safeStringify returns the original object
    expect(result).toBe(circular);
  });

  it("stringifies undefined as undefined (JSON.stringify behavior)", () => {
    const result = safeStringify(undefined);
    expect(result).toBeUndefined();
  });

  it("stringifies boolean values", () => {
    expect(safeStringify(true)).toBe("true");
    expect(safeStringify(false)).toBe("false");
  });

  it("stringifies nested objects", () => {
    const result = safeStringify({ a: { b: { c: 1 } } });
    expect(result).toBe('{"a":{"b":{"c":1}}}');
  });
});
