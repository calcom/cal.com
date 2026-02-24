import { describe, expect, it } from "vitest";
import { escapeForJsString } from "./escapeForJsString";

describe("escapeForJsString", () => {
  it("returns plain string unchanged", () => {
    expect(escapeForJsString("hello")).toBe("hello");
  });

  it("escapes double quotes", () => {
    expect(escapeForJsString('say "hi"')).toBe('say \\"hi\\"');
  });

  it("escapes backslashes", () => {
    expect(escapeForJsString("a\\b")).toBe("a\\\\b");
  });

  it("escapes < to unicode to prevent script injection", () => {
    expect(escapeForJsString("<script>")).toBe("\\u003cscript>");
  });

  it("escapes newlines", () => {
    expect(escapeForJsString("line1\nline2")).toBe("line1\\nline2");
  });

  it("handles empty string", () => {
    expect(escapeForJsString("")).toBe("");
  });

  it("handles string with multiple special chars", () => {
    const result = escapeForJsString('</script><script>alert("xss")');
    expect(result).not.toContain("<");
    expect(result).toContain("\\u003c");
  });
});
