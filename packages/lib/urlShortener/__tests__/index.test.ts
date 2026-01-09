import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { urlShortener } from "../index";

// Mock the dependencies
vi.mock("../sink", () => ({
  sink: {
    isConfigured: vi.fn(),
    createMany: vi.fn(),
  },
}));

vi.mock("@calcom/features/auth/lib/dub", () => ({
  dub: {
    links: {
      createMany: vi.fn(),
    },
  },
}));

import { dub } from "@calcom/features/auth/lib/dub";
import { sink } from "../sink";

describe("UrlShortener", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("shortenMany - Sink configuration", () => {
    beforeEach(() => {
      process.env.SINK_API_URL = "https://sink.test.com";
    });

    it("should use Sink when configured", async () => {
      (sink.isConfigured as any).mockReturnValue(true);
      (sink.createMany as any).mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sink.test.com/abc" },
      ]);

      const result = await urlShortener.shortenMany(["https://example.com"]);

      expect(sink.isConfigured).toHaveBeenCalled();
      expect(sink.createMany).toHaveBeenCalledWith(["https://example.com"]);
      expect(result).toEqual([{ shortLink: "https://sink.test.com/abc" }]);
      expect(dub.links.createMany).not.toHaveBeenCalled();
    });

    it("should use Sink for multiple URLs", async () => {
      (sink.isConfigured as any).mockReturnValue(true);
      (sink.createMany as any).mockResolvedValue([
        { url: "https://example1.com", shortLink: "https://sink.test.com/abc" },
        { url: "https://example2.com", shortLink: "https://sink.test.com/def" },
        { url: "https://example3.com", shortLink: "https://sink.test.com/ghi" },
      ]);

      const result = await urlShortener.shortenMany([
        "https://example1.com",
        "https://example2.com",
        "https://example3.com",
      ]);

      expect(result).toEqual([
        { shortLink: "https://sink.test.com/abc" },
        { shortLink: "https://sink.test.com/def" },
        { shortLink: "https://sink.test.com/ghi" },
      ]);
    });

    it("should return original URLs when Sink returns null shortLinks", async () => {
      (sink.isConfigured as any).mockReturnValue(true);
      (sink.createMany as any).mockResolvedValue([
        { url: "https://example1.com", shortLink: "https://sink.test.com/abc" },
        { url: "https://example2.com", shortLink: null },
        { url: "https://example3.com", shortLink: "https://sink.test.com/def" },
      ]);

      const result = await urlShortener.shortenMany([
        "https://example1.com",
        "https://example2.com",
        "https://example3.com",
      ]);

      expect(result).toEqual([
        { shortLink: "https://sink.test.com/abc" },
        { shortLink: "https://example2.com" },
        { shortLink: "https://sink.test.com/def" },
      ]);
    });

    it("should return original URLs when Sink throws error", async () => {
      (sink.isConfigured as any).mockReturnValue(true);
      (sink.createMany as any).mockRejectedValue(new Error("Sink API error"));

      const result = await urlShortener.shortenMany([
        "https://example1.com",
        "https://example2.com",
      ]);

      expect(result).toEqual([
        { shortLink: "https://example1.com" },
        { shortLink: "https://example2.com" },
      ]);
    });
  });

  describe("shortenMany - Dub configuration", () => {
    beforeEach(() => {
      delete process.env.SINK_API_URL;
      process.env.DUB_API_KEY = "dub-test-key";
      (sink.isConfigured as any).mockReturnValue(false);
    });

    it("should use Dub when Sink is not configured", async () => {
      (dub.links.createMany as any).mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sms.cal.com/abc" },
      ]);

      const result = await urlShortener.shortenMany(["https://example.com"]);

      expect(sink.isConfigured).toHaveBeenCalled();
      expect(dub.links.createMany).toHaveBeenCalledWith([
        {
          domain: "sms.cal.com",
          url: "https://example.com",
          folderId: undefined,
        },
      ]);
      expect(result).toEqual([{ shortLink: "https://sms.cal.com/abc" }]);
    });

    it("should use custom domain and folderId when provided", async () => {
      (dub.links.createMany as any).mockResolvedValue([
        { url: "https://example.com", shortLink: "https://custom.com/abc" },
      ]);

      await urlShortener.shortenMany(["https://example.com"], {
        domain: "custom.com",
        folderId: "folder123",
      });

      expect(dub.links.createMany).toHaveBeenCalledWith([
        {
          domain: "custom.com",
          url: "https://example.com",
          folderId: "folder123",
        },
      ]);
    });

    it("should handle multiple URLs with Dub", async () => {
      (dub.links.createMany as any).mockResolvedValue([
        { url: "https://example1.com", shortLink: "https://sms.cal.com/abc" },
        { url: "https://example2.com", shortLink: "https://sms.cal.com/def" },
      ]);

      const result = await urlShortener.shortenMany([
        "https://example1.com",
        "https://example2.com",
      ]);

      expect(result).toEqual([
        { shortLink: "https://sms.cal.com/abc" },
        { shortLink: "https://sms.cal.com/def" },
      ]);
    });

    it("should filter empty URLs before sending to Dub", async () => {
      (dub.links.createMany as any).mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sms.cal.com/abc" },
      ]);

      await urlShortener.shortenMany(["", "https://example.com", ""]);

      expect(dub.links.createMany).toHaveBeenCalledWith([
        {
          domain: "sms.cal.com",
          url: "https://example.com",
          folderId: undefined,
        },
      ]);
    });

    it("should return original URLs when Dub returns error results", async () => {
      (dub.links.createMany as any).mockResolvedValue([
        { url: "https://example1.com", shortLink: "https://sms.cal.com/abc" },
        { error: "rate_limit_exceeded" },
        { url: "https://example3.com", shortLink: "https://sms.cal.com/def" },
      ]);

      const result = await urlShortener.shortenMany([
        "https://example1.com",
        "https://example2.com",
        "https://example3.com",
      ]);

      expect(result).toEqual([
        { shortLink: "https://sms.cal.com/abc" },
        { shortLink: "https://example2.com" },
        { shortLink: "https://sms.cal.com/def" },
      ]);
    });

    it("should return original URLs when Dub throws error", async () => {
      (dub.links.createMany as any).mockRejectedValue(new Error("Dub API error"));

      const result = await urlShortener.shortenMany([
        "https://example1.com",
        "https://example2.com",
      ]);

      expect(result).toEqual([
        { shortLink: "https://example1.com" },
        { shortLink: "https://example2.com" },
      ]);
    });
  });

  describe("shortenMany - No configuration", () => {
    beforeEach(() => {
      delete process.env.SINK_API_URL;
      delete process.env.DUB_API_KEY;
      (sink.isConfigured as any).mockReturnValue(false);
    });

    it("should return original URLs when no shortener is configured", async () => {
      const result = await urlShortener.shortenMany([
        "https://example1.com",
        "https://example2.com",
      ]);

      expect(result).toEqual([
        { shortLink: "https://example1.com" },
        { shortLink: "https://example2.com" },
      ]);
      expect(sink.createMany).not.toHaveBeenCalled();
      expect(dub.links.createMany).not.toHaveBeenCalled();
    });

    it("should handle empty array when no shortener configured", async () => {
      const result = await urlShortener.shortenMany([]);

      expect(result).toEqual([]);
    });
  });

  describe("shortenMany - Priority and fallback", () => {
    it("should prioritize Sink over Dub when both are configured", async () => {
      process.env.SINK_API_URL = "https://sink.test.com";
      process.env.DUB_API_KEY = "dub-test-key";
      (sink.isConfigured as any).mockReturnValue(true);
      (sink.createMany as any).mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sink.test.com/abc" },
      ]);

      const result = await urlShortener.shortenMany(["https://example.com"]);

      expect(sink.createMany).toHaveBeenCalled();
      expect(dub.links.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([{ shortLink: "https://sink.test.com/abc" }]);
    });

    it("should NOT fallback to Dub when Sink is configured but fails", async () => {
      process.env.SINK_API_URL = "https://sink.test.com";
      process.env.DUB_API_KEY = "dub-test-key";
      (sink.isConfigured as any).mockReturnValue(true);
      (sink.createMany as any).mockRejectedValue(new Error("Sink error"));

      const result = await urlShortener.shortenMany(["https://example.com"]);

      expect(sink.createMany).toHaveBeenCalled();
      expect(dub.links.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([{ shortLink: "https://example.com" }]);
    });
  });

  describe("shortenMany - Edge cases", () => {
    beforeEach(() => {
      delete process.env.SINK_API_URL;
      delete process.env.DUB_API_KEY;
      (sink.isConfigured as any).mockReturnValue(false);
    });

    it("should handle empty array", async () => {
      const result = await urlShortener.shortenMany([]);

      expect(result).toEqual([]);
    });

    it("should handle array with empty strings", async () => {
      const result = await urlShortener.shortenMany(["", "", ""]);

      expect(result).toEqual([
        { shortLink: "" },
        { shortLink: "" },
        { shortLink: "" },
      ]);
    });

    it("should handle mixed empty and valid URLs", async () => {
      process.env.DUB_API_KEY = "dub-test-key";
      (dub.links.createMany as any).mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sms.cal.com/abc" },
      ]);

      const result = await urlShortener.shortenMany([
        "",
        "https://example.com",
        "",
      ]);

      // Dub only receives non-empty URLs
      expect(dub.links.createMany).toHaveBeenCalledWith([
        {
          domain: "sms.cal.com",
          url: "https://example.com",
          folderId: undefined,
        },
      ]);

      expect(result).toEqual([
        { shortLink: "" },
        { shortLink: "https://sms.cal.com/abc" },
        { shortLink: "" },
      ]);
    });

    it("should handle very long URLs", async () => {
      const longUrl = "https://example.com/" + "a".repeat(2000);
      process.env.DUB_API_KEY = "dub-test-key";
      (dub.links.createMany as any).mockResolvedValue([
        { url: longUrl, shortLink: "https://sms.cal.com/abc" },
      ]);

      const result = await urlShortener.shortenMany([longUrl]);

      expect(result).toEqual([{ shortLink: "https://sms.cal.com/abc" }]);
    });
  });
});
