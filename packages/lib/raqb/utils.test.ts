import { describe, expect, it } from "vitest";
import { caseInsensitive } from "./utils";

describe("caseInsensitive", () => {
  it("lowercases a string", () => {
    expect(caseInsensitive("Hello World")).toBe("hello world");
  });

  it("lowercases an array of strings", () => {
    expect(caseInsensitive(["FOO", "Bar"])).toEqual(["foo", "bar"]);
  });

  it("returns empty string unchanged", () => {
    expect(caseInsensitive("")).toBe("");
  });

  it("returns empty array unchanged", () => {
    expect(caseInsensitive([])).toEqual([]);
  });

  it("returns already lowercase string unchanged", () => {
    expect(caseInsensitive("abc")).toBe("abc");
  });

  it("handles mixed case array", () => {
    expect(caseInsensitive(["UPPER", "lower", "MiXeD"])).toEqual(["upper", "lower", "mixed"]);
  });
});
