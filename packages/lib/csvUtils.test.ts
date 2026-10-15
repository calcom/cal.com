import { describe, expect, it } from "vitest";
import { objectsToCsv, sanitizeValue } from "./csvUtils";

describe("csvUtils", () => {
  describe("sanitizeValue", () => {
    it("escapes quotes by doubling them and wrapping in quotes", () => {
      expect(sanitizeValue('hello "world"')).toBe('"hello ""world"""');
    });

    it("quotes values containing commas", () => {
      expect(sanitizeValue("hello,world")).toBe('"hello,world"');
    });

    it("quotes values containing newlines", () => {
      expect(sanitizeValue("hello\nworld")).toBe('"hello\nworld"');
    });

    it("quotes values containing bare carriage returns per RFC 4180", () => {
      expect(sanitizeValue("hello\rworld")).toBe('"hello\rworld"');
    });

    it("quotes values containing CRLF sequences", () => {
      expect(sanitizeValue("hello\r\nworld")).toBe('"hello\r\nworld"');
    });

    it("does not quote values without special characters", () => {
      expect(sanitizeValue("hello world")).toBe("hello world");
    });

    it("neutralizes formula injection with = prefix", () => {
      expect(sanitizeValue("=1+1")).toBe("'=1+1");
    });

    it("neutralizes formula injection with + prefix", () => {
      expect(sanitizeValue("+1-1")).toBe("'+1-1");
    });

    it("neutralizes formula injection with - prefix", () => {
      expect(sanitizeValue("-SUM(A1:A10)")).toBe("'-SUM(A1:A10)");
    });

    it("neutralizes formula injection with @ prefix", () => {
      expect(sanitizeValue("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
    });

    it("neutralizes formula injection with tab prefix", () => {
      expect(sanitizeValue("\tmalicious")).toBe("'\tmalicious");
    });

    it("neutralizes formula injection with carriage return prefix and quotes due to CR", () => {
      expect(sanitizeValue("\rmalicious")).toBe('"\'\rmalicious"');
    });

    it("handles formula injection containing commas by prefixing and quoting", () => {
      expect(sanitizeValue("=1,2")).toBe("\"'=1,2\"");
    });

    it("handles empty strings", () => {
      expect(sanitizeValue("")).toBe("");
    });
  });

  describe("objectsToCsv", () => {
    it("converts array of objects to CSV string with sanitized headers and rows", () => {
      const data = [
        { name: "Alice", email: "alice@example.com" },
        { name: "Bob", email: "bob@example.com" },
      ];
      const csv = objectsToCsv(data);
      expect(csv).toBe("name,email\nAlice,alice@example.com\nBob,bob@example.com");
    });

    it("neutralizes formula injection in table cell data", () => {
      const data = [{ name: "=1+1", email: "test@example.com" }];
      const csv = objectsToCsv(data);
      expect(csv).toContain("'=1+1");
    });

    it("quotes values with carriage returns in table cell data", () => {
      const data = [{ name: "hello\rworld", email: "test@example.com" }];
      const csv = objectsToCsv(data);
      expect(csv).toContain('"hello\rworld"');
    });

    it("returns empty string when data array is empty", () => {
      expect(objectsToCsv([])).toBe("");
    });
  });
});
