import { describe, expect, it } from "vitest";
import { validJson } from "./jsonUtils";

describe("validJson", () => {
  it("returns parsed object for valid JSON object", () => {
    expect(validJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns parsed array for valid JSON array", () => {
    expect(validJson("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("returns false for a JSON string primitive", () => {
    expect(validJson('"hello"')).toBe(false);
  });

  it("returns false for a JSON number primitive", () => {
    expect(validJson("42")).toBe(false);
  });

  it("returns false for a JSON boolean primitive", () => {
    expect(validJson("true")).toBe(false);
  });

  it("returns false for a JSON null", () => {
    expect(validJson("null")).toBe(false);
  });

  it("returns false for invalid JSON", () => {
    expect(validJson("{invalid}")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(validJson("")).toBe(false);
  });

  it("returns parsed object for nested JSON", () => {
    const input = '{"a":{"b":[1,2,3]},"c":true}';
    expect(validJson(input)).toEqual({ a: { b: [1, 2, 3] }, c: true });
  });

  it("returns parsed empty object for '{}'", () => {
    expect(validJson("{}")).toEqual({});
  });

  it("returns parsed empty array for '[]'", () => {
    expect(validJson("[]")).toEqual([]);
  });
});
