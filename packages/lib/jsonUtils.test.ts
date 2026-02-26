import { describe, expect, it } from "vitest";

import { validJson } from "./jsonUtils";

describe("validJson", () => {
  it("returns parsed object for valid JSON object", () => {
    const result = validJson('{"key":"value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("returns parsed array for valid JSON array", () => {
    const result = validJson("[1,2,3]");
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns false for invalid JSON", () => {
    expect(validJson("not json")).toBe(false);
  });

  it("returns false for a plain string (valid JSON but not an object)", () => {
    expect(validJson('"hello"')).toBe(false);
  });

  it("returns false for a number (valid JSON but not an object)", () => {
    expect(validJson("42")).toBe(false);
  });

  it("returns false for boolean true (valid JSON but not an object)", () => {
    expect(validJson("true")).toBe(false);
  });

  it("returns false for null (valid JSON but not an object)", () => {
    // typeof null === "object" but the check is `o && typeof o === "object"`
    // null is falsy, so it returns false
    expect(validJson("null")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(validJson("")).toBe(false);
  });

  it("handles nested objects", () => {
    const result = validJson('{"a":{"b":1}}');
    expect(result).toEqual({ a: { b: 1 } });
  });

  it("handles empty object", () => {
    const result = validJson("{}");
    expect(result).toEqual({});
  });

  it("handles empty array", () => {
    const result = validJson("[]");
    expect(result).toEqual([]);
  });
});
