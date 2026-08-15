import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadAsCsv, objectsToCsv, sanitizeValue } from "./csvUtils";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sanitizeValue", () => {
  it("returns simple values unchanged", () => {
    expect(sanitizeValue("hello")).toBe("hello");
  });

  it("wraps values with commas in quotes", () => {
    expect(sanitizeValue("hello,world")).toBe('"hello,world"');
  });

  it("wraps values with newlines in quotes", () => {
    expect(sanitizeValue("hello\nworld")).toBe('"hello\nworld"');
  });

  it("doubles quotes and wraps values containing double quotes", () => {
    expect(sanitizeValue('he said "hello"')).toBe('"he said ""hello"""');
  });

  it("handles values with quotes and commas", () => {
    expect(sanitizeValue('he said "hello", world')).toBe('"he said ""hello"", world"');
  });

  it("prefixes formula-trigger characters with single quote to prevent injection", () => {
    expect(sanitizeValue("=HYPERLINK(http://evil.com)")).toBe("'=HYPERLINK(http://evil.com)");
    expect(sanitizeValue("+SUM(A1:A10)")).toBe("'+SUM(A1:A10)");
    expect(sanitizeValue("-SUM(A1:A10)")).toBe("'-SUM(A1:A10)");
    expect(sanitizeValue("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
  });

  it("keeps the formula prefix on values that also need quoting", () => {
    // A formula containing a comma must still get the ' prefix: quoting alone
    // does not stop Excel/Sheets from evaluating it.
    expect(sanitizeValue("=SUM(1,1)")).toBe('"\'=SUM(1,1)"');
    expect(sanitizeValue('=HYPERLINK("http://evil.com","click")')).toBe(
      '"\'=HYPERLINK(""http://evil.com"",""click"")"'
    );
    expect(sanitizeValue("=1\n+2")).toBe('"\'=1\n+2"');
  });

  it("does not prefix non-formula values", () => {
    expect(sanitizeValue("hello")).toBe("hello");
    expect(sanitizeValue("123")).toBe("123");
    expect(sanitizeValue("john@example.com")).toBe("john@example.com");
  });
});

describe("objectsToCsv", () => {
  it("handles values with newlines correctly", () => {
    const data = [
      { name: "Alice", note: "hello\nworld" },
      { name: "Bob", note: "normal" },
    ];
    const csv = objectsToCsv(data);
    expect(csv).toBe('name,note\nAlice,"hello\nworld"\nBob,normal');
  });
});
