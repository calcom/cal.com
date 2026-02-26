import { describe, expect, it } from "vitest";

import { escapeForJsString } from "./escapeForJsString";

describe("escapeForJsString", () => {
  it("returns plain string unchanged", () => {
    expect(escapeForJsString("hello world")).toBe("hello world");
  });

  it("escapes double quotes", () => {
    const result = escapeForJsString('say "hello"');
    expect(result).toBe('say \\"hello\\"');
  });

  it("escapes backslashes", () => {
    const result = escapeForJsString("path\\to\\file");
    expect(result).toBe("path\\\\to\\\\file");
  });

  it("escapes newlines", () => {
    const result = escapeForJsString("line1\nline2");
    expect(result).toBe("line1\\nline2");
  });

  it("escapes < as unicode to prevent script injection", () => {
    const result = escapeForJsString("<script>alert('xss')</script>");
    expect(result).toContain("\\u003c");
    expect(result).not.toContain("<");
  });

  it("handles empty string", () => {
    expect(escapeForJsString("")).toBe("");
  });

  it("escapes tab characters", () => {
    const result = escapeForJsString("col1\tcol2");
    expect(result).toBe("col1\\tcol2");
  });

  it("handles string with only special characters", () => {
    const result = escapeForJsString("<>");
    expect(result).toContain("\\u003c");
    // > is not escaped by JSON.stringify, only < is replaced
    expect(result).toContain(">");
  });

  it("escapes multiple < occurrences", () => {
    const result = escapeForJsString("a < b < c");
    const matches = result.match(/\\u003c/g);
    expect(matches).toHaveLength(2);
  });
});
