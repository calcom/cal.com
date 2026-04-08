import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module
vi.mock("@calcom/features/ee/api-keys/lib/autoLock", () => ({
  LockReason: { MALICIOUS_URL_IN_WORKFLOW: "MALICIOUS_URL_IN_WORKFLOW" },
  lockUser: vi.fn(),
}));

vi.mock("@calcom/lib/constants", () => ({
  URL_SCANNING_ENABLED: true,
  WEBAPP_URL: "https://app.cal.com",
  WEBSITE_URL: "https://cal.com",
  CONSOLE_URL: "https://console.cal.com",
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { extractUrlsFromHtml } from "./urlScanner";

describe("urlScanner", () => {
  describe("extractUrlsFromHtml", () => {
    it("extracts URLs from anchor href attributes", () => {
      const html = '<a href="https://example.com/page">Click here</a>';
      const urls = extractUrlsFromHtml(html);
      expect(urls).toContain("https://example.com/page");
    });

    it("extracts multiple URLs from different anchor tags", () => {
      const html = `
        <a href="https://example.com/one">Link 1</a>
        <a href="https://other.com/page">Link 2</a>
      `;
      const urls = extractUrlsFromHtml(html);
      expect(urls).toContain("https://example.com/one");
      expect(urls).toContain("https://other.com/page");
    });

    it("extracts bare URLs from text content", () => {
      const html = "<p>Visit https://example.com/path for more info</p>";
      const urls = extractUrlsFromHtml(html);
      expect(urls).toContain("https://example.com/path");
    });

    it("extracts http URLs", () => {
      const html = '<a href="http://example.com/path">Link</a>';
      const urls = extractUrlsFromHtml(html);
      expect(urls).toContain("http://example.com/path");
    });

    it("ignores non-HTTP URLs (e.g., mailto:, javascript:)", () => {
      const html = `
        <a href="mailto:test@example.com">Email</a>
        <a href="javascript:void(0)">Click</a>
      `;
      const urls = extractUrlsFromHtml(html);
      expect(urls).toHaveLength(0);
    });

    it("deduplicates URLs", () => {
      const html = `
        <a href="https://example.com">Link 1</a>
        <a href="https://example.com">Link 2</a>
        Visit https://example.com for more
      `;
      const urls = extractUrlsFromHtml(html);
      // Should have only unique URLs
      const uniqueUrls = new Set(urls);
      expect(urls.length).toBe(uniqueUrls.size);
    });

    it("normalizes root URLs consistently", () => {
      const html = '<a href="https://example.com/">Link</a>';
      const urls = extractUrlsFromHtml(html);
      expect(urls).toHaveLength(1);
      // normalizeUrl sets pathname to "" but URL.toString() still includes origin
      expect(urls[0]).toMatch(/^https:\/\/example\.com/);
    });

    it("cleans trailing punctuation from bare URLs", () => {
      const html = "<p>Visit https://example.com/page, or https://other.com/path.</p>";
      const urls = extractUrlsFromHtml(html);
      expect(urls).toContain("https://example.com/page");
      expect(urls).toContain("https://other.com/path");
    });

    it("returns empty array for HTML without URLs", () => {
      const html = "<p>No links here</p>";
      const urls = extractUrlsFromHtml(html);
      expect(urls).toHaveLength(0);
    });

    it("handles empty string input", () => {
      const urls = extractUrlsFromHtml("");
      expect(urls).toHaveLength(0);
    });

    it("handles single-quoted href attributes", () => {
      const html = "<a href='https://example.com/page'>Link</a>";
      const urls = extractUrlsFromHtml(html);
      expect(urls).toContain("https://example.com/page");
    });

    it("handles URLs with query parameters", () => {
      const html = '<a href="https://example.com/page?foo=bar&baz=qux">Link</a>';
      const urls = extractUrlsFromHtml(html);
      expect(urls.some((u) => u.includes("example.com/page") && u.includes("foo=bar"))).toBe(true);
    });

    it("handles URLs with fragments", () => {
      const html = '<a href="https://example.com/page#section">Link</a>';
      const urls = extractUrlsFromHtml(html);
      expect(urls.some((u) => u.includes("example.com/page#section"))).toBe(true);
    });
  });
});
