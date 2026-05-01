import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

const mockCreateMany = vi.fn();
vi.mock("@calcom/features/auth/lib/dub", () => ({
  dub: {
    links: {
      createMany: (...args: unknown[]) => mockCreateMany(...args),
    },
  },
}));

import { DubShortener } from "../providers/DubShortener";

describe("DubShortener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("DUB_API_KEY", "");
  });

  describe("isConfigured", () => {
    it("returns true when DUB_API_KEY is set", () => {
      vi.stubEnv("DUB_API_KEY", "test-key");
      expect(DubShortener.isConfigured()).toBe(true);
    });

    it("returns false when DUB_API_KEY is not set", () => {
      expect(DubShortener.isConfigured()).toBe(false);
    });
  });

  describe("shortenMany", () => {
    it("returns shortened links", async () => {
      mockCreateMany.mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sms.cal.com/abc" },
      ]);
      const shortener = new DubShortener();

      const result = await shortener.shortenMany(["https://example.com"]);

      expect(result).toEqual([{ shortLink: "https://sms.cal.com/abc" }]);
    });

    it("passes domain and folderId options", async () => {
      mockCreateMany.mockResolvedValue([{ url: "https://example.com", shortLink: "https://custom.com/abc" }]);
      const shortener = new DubShortener();

      await shortener.shortenMany(["https://example.com"], {
        domain: "custom.com",
        folderId: "folder123",
      });

      expect(mockCreateMany).toHaveBeenCalledWith([
        {
          domain: "custom.com",
          url: "https://example.com",
          folderId: "folder123",
        },
      ]);
    });

    it("handles multiple URLs", async () => {
      mockCreateMany.mockResolvedValue([
        { url: "https://example1.com", shortLink: "https://sms.cal.com/abc" },
        { url: "https://example2.com", shortLink: "https://sms.cal.com/def" },
      ]);
      const shortener = new DubShortener();

      const result = await shortener.shortenMany(["https://example1.com", "https://example2.com"]);

      expect(result).toEqual([
        { shortLink: "https://sms.cal.com/abc" },
        { shortLink: "https://sms.cal.com/def" },
      ]);
    });

    it("filters empty URLs before sending to Dub", async () => {
      mockCreateMany.mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sms.cal.com/abc" },
      ]);
      const shortener = new DubShortener();

      await shortener.shortenMany(["", "https://example.com", ""]);

      expect(mockCreateMany).toHaveBeenCalledWith([
        {
          domain: undefined,
          url: "https://example.com",
          folderId: undefined,
        },
      ]);
    });

    it("returns original URL when Dub returns error result", async () => {
      mockCreateMany.mockResolvedValue([
        { url: "https://example1.com", shortLink: "https://sms.cal.com/abc" },
        { error: "rate_limit_exceeded" },
        { url: "https://example3.com", shortLink: "https://sms.cal.com/def" },
      ]);
      const shortener = new DubShortener();

      const result = await shortener.shortenMany([
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

    it("returns original URLs on API error", async () => {
      mockCreateMany.mockRejectedValue(new Error("Dub API error"));
      const shortener = new DubShortener();

      const result = await shortener.shortenMany(["https://example1.com", "https://example2.com"]);

      expect(result).toEqual([{ shortLink: "https://example1.com" }, { shortLink: "https://example2.com" }]);
    });

    it("handles mixed empty and valid URLs correctly", async () => {
      mockCreateMany.mockResolvedValue([
        { url: "https://example.com", shortLink: "https://sms.cal.com/abc" },
      ]);
      const shortener = new DubShortener();

      const result = await shortener.shortenMany(["", "https://example.com", ""]);

      expect(result).toEqual([
        { shortLink: "" },
        { shortLink: "https://sms.cal.com/abc" },
        { shortLink: "" },
      ]);
    });
  });
});
