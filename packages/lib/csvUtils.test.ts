import { describe, expect, it, vi } from "vitest";
import { downloadAsCsv, objectsToCsv, sanitizeValue } from "./csvUtils";

describe("sanitizeValue", () => {
  it("returns plain value unchanged", () => {
    expect(sanitizeValue("hello")).toBe("hello");
  });

  it("escapes double quotes by doubling them", () => {
    expect(sanitizeValue('say "hi"')).toBe('"say ""hi"""');
  });

  it("wraps value containing commas in quotes", () => {
    expect(sanitizeValue("a,b")).toBe('"a,b"');
  });

  it("wraps value containing newlines in quotes", () => {
    expect(sanitizeValue("line1\nline2")).toBe('"line1\nline2"');
  });

  it("prioritizes quote-escaping over comma wrapping", () => {
    expect(sanitizeValue('"a,b"')).toBe('"""a,b"""');
  });
});

describe("objectsToCsv", () => {
  it("returns empty string for empty array", () => {
    expect(objectsToCsv([])).toBe("");
  });

  it("converts single object to CSV with header row", () => {
    const result = objectsToCsv([{ name: "Alice", age: "30" }]);
    expect(result).toBe("name,age\nAlice,30");
  });

  it("converts multiple objects to CSV", () => {
    const result = objectsToCsv([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
    expect(result).toBe("name,age\nAlice,30\nBob,25");
  });

  it("sanitizes values containing special characters", () => {
    const result = objectsToCsv([{ note: 'He said "hi"' }]);
    expect(result).toBe('note\n"He said ""hi"""');
  });

  it("handles null/undefined values gracefully", () => {
    const result = objectsToCsv([{ a: null, b: undefined }] as Record<string, unknown>[]);
    expect(result).toBe("a,b\n,");
  });
});

describe("downloadAsCsv", () => {
  it("creates a download link and triggers click", () => {
    const mockClick = vi.fn();
    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:url");
    const mockRevokeObjectURL = vi.fn();

    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: mockClick,
    } as unknown as HTMLAnchorElement);

    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    downloadAsCsv("a,b\n1,2", "test.csv");

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockClick).toHaveBeenCalledOnce();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:url");
  });

  it("converts array of objects before downloading", () => {
    const mockClick = vi.fn();
    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:url");
    const mockRevokeObjectURL = vi.fn();

    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: mockClick,
    } as unknown as HTMLAnchorElement);

    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    downloadAsCsv([{ name: "Alice" }], "test.csv");

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockClick).toHaveBeenCalledOnce();
  });
});
