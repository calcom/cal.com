import { describe, expect, it } from "vitest";
import { caseInsensitive } from "./utils";

describe("caseInsensitive", () => {
  it("lowercases a single string", () => {
    expect(caseInsensitive("Hello World")).toBe("hello world");
  });

  it("lowercases all strings in an array", () => {
    expect(caseInsensitive(["Hello", "WORLD"])).toEqual(["hello", "world"]);
  });

  it("handles empty string", () => {
    expect(caseInsensitive("")).toBe("");
  });

  it("handles empty array", () => {
    expect(caseInsensitive([])).toEqual([]);
  });

  it("handles already-lowercase input", () => {
    expect(caseInsensitive("already lowercase")).toBe("already lowercase");
  });

  it("handles mixed case input in array", () => {
    expect(caseInsensitive(["FiRsT", "sEcOnD", "THIRD"])).toEqual(["first", "second", "third"]);
  });
});
