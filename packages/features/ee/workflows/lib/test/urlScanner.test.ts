import { describe, expect, test, vi } from "vitest";
import { extractUrlsFromHtml, isUrlScanningEnabled } from "../urlScanner";

// Mock the constants module
vi.mock("@calcom/lib/constants", async () => {
  const actual = (await vi.importActual("@calcom/lib/constants")) as typeof import("@calcom/lib/constants");
  return {
    ...actual,
    URL_SCANNING_ENABLED: true,
  };
});

describe("urlScanner", () => {
  describe("extractUrlsFromHtml", () => {
    describe("happy paths", () => {
      test("should extract URLs from href attributes", () => {
        const html = '<a href="https://example.com">Click here</a>';
        const result = extractUrlsFromHtml(html);
        // URLs are normalized - root URLs get trailing slash removed but become normalized form
        expect(result).toEqual(["https://example.com/"]);
      });

      test("should extract multiple URLs from href attributes", () => {
        const html = `
          <a href="https://example.com">Link 1</a>
          <a href="https://another.com/page">Link 2</a>
        `;
        const result = extractUrlsFromHtml(html);
        expect(result).toContain("https://example.com/");
        expect(result).toContain("https://another.com/page");
        expect(result.length).toBe(2);
      });

      test("should extract bare URLs from text content", () => {
        const html = "<p>Visit https://example.com for more info</p>";
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/"]);
      });

      test("should extract both href and bare URLs", () => {
        const html = `
          <a href="https://link.com">Click</a>
          <p>Also visit https://bare.com</p>
        `;
        const result = extractUrlsFromHtml(html);
        expect(result).toContain("https://link.com/");
        expect(result).toContain("https://bare.com/");
      });

      test("should deduplicate URLs", () => {
        const html = `
          <a href="https://example.com">Link 1</a>
          <a href="https://example.com">Link 2</a>
          <p>https://example.com</p>
        `;
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/"]);
      });

      test("should handle URLs with paths and query strings", () => {
        const html = '<a href="https://example.com/path?query=value&foo=bar">Link</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/path?query=value&foo=bar"]);
      });

      test("should handle http URLs", () => {
        const html = '<a href="http://example.com">Link</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["http://example.com/"]);
      });

      test("should handle single-quoted href attributes", () => {
        const html = "<a href='https://example.com'>Link</a>";
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/"]);
      });

      test("should clean trailing punctuation from bare URLs", () => {
        const html = "<p>Visit https://example.com. More text here.</p>";
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/"]);
      });

      test("should handle URLs with ports", () => {
        const html = '<a href="https://example.com:8080/path">Link</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com:8080/path"]);
      });

      test("should handle URLs with fragments", () => {
        const html = '<a href="https://example.com/page#section">Link</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/page#section"]);
      });
    });

    describe("unhappy paths", () => {
      test("should return empty array for empty string", () => {
        const result = extractUrlsFromHtml("");
        expect(result).toEqual([]);
      });

      test("should return empty array for HTML without URLs", () => {
        const html = "<p>No links here</p>";
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual([]);
      });

      test("should ignore mailto links", () => {
        const html = '<a href="mailto:test@example.com">Email us</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual([]);
      });

      test("should ignore tel links", () => {
        const html = '<a href="tel:+1234567890">Call us</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual([]);
      });

      test("should ignore javascript links", () => {
        const html = '<a href="javascript:void(0)">Click</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual([]);
      });

      test("should ignore relative URLs", () => {
        const html = '<a href="/relative/path">Link</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual([]);
      });

      test("should ignore anchor-only links", () => {
        const html = '<a href="#section">Jump to section</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual([]);
      });

      test("should handle malformed HTML gracefully", () => {
        const html = '<a href="https://example.com">Unclosed link';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/"]);
      });

      test("should handle empty href attributes", () => {
        const html = '<a href="">Empty link</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual([]);
      });
    });

    describe("URL normalization", () => {
      test("should normalize URLs with trailing slash", () => {
        const html = `
          <a href="https://example.com/">Link 1</a>
          <a href="https://example.com">Link 2</a>
        `;
        const result = extractUrlsFromHtml(html);
        // Both should normalize to the same URL
        expect(result.length).toBe(1);
      });

      test("should preserve path when normalizing", () => {
        const html = '<a href="https://example.com/path/">Link</a>';
        const result = extractUrlsFromHtml(html);
        expect(result).toEqual(["https://example.com/path/"]);
      });
    });
  });

  describe("isUrlScanningEnabled", () => {
    test("should return true when URL_SCANNING_ENABLED is true", () => {
      const result = isUrlScanningEnabled();
      expect(result).toBe(true);
    });
  });
});
