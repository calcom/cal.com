import type { Mock } from "vitest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SinkClient } from "../sink";

// Mock fetch globally
const mockFetch = vi.fn() as Mock;
global.fetch = mockFetch;

// Mock logger to avoid console noise
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

describe("SinkClient", () => {
  const mockSinkUrl = "https://sink.test.com";
  const mockApiKey = "test-api-key";
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createLink", () => {
    beforeEach(() => {
      process.env.SINK_API_URL = mockSinkUrl;
      process.env.SINK_API_KEY = mockApiKey;
    });

    it("should successfully create a shortened link", async () => {
      const mockResponse = {
        link: {
          id: "abc123",
          url: "https://example.com",
          slug: "xyz",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          views: 0,
        },
        shortLink: "https://sink.test.com/xyz",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const testSink = new SinkClient();
      const result = await testSink.createLink("https://example.com");

      expect(result).toBe("https://sink.test.com/xyz");
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockSinkUrl}/api/link/create`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockApiKey}`,
          }),
          body: JSON.stringify({ url: "https://example.com" }),
        })
      );
    });

    it("should return null when Sink is not configured", async () => {
      process.env.SINK_API_URL = "";

      const testSink = new SinkClient();
      const result = await testSink.createLink("https://example.com");

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should return null on API error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const testSink = new SinkClient();
      const result = await testSink.createLink("https://example.com");

      expect(result).toBeNull();
    });

    it("should return null on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const testSink = new SinkClient();
      const result = await testSink.createLink("https://example.com");

      expect(result).toBeNull();
    });

    it("should pass options to the API", async () => {
      const mockResponse = {
        link: {
          id: "abc123",
          url: "https://example.com",
          slug: "custom-slug",
          comment: "Test comment",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          views: 0,
        },
        shortLink: "https://sink.test.com/custom-slug",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const testSink = new SinkClient();
      await testSink.createLink("https://example.com", {
        slug: "custom-slug",
        comment: "Test comment",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockSinkUrl}/api/link/create`,
        expect.objectContaining({
          body: JSON.stringify({
            url: "https://example.com",
            slug: "custom-slug",
            comment: "Test comment",
          }),
        })
      );
    });
  });

  describe("createMany", () => {
    beforeEach(() => {
      process.env.SINK_API_URL = mockSinkUrl;
      process.env.SINK_API_KEY = mockApiKey;
    });

    it("should successfully shorten multiple links", async () => {
      const mockResponse = (url: string, index: number) => ({
        link: {
          id: `abc${index}`,
          url,
          slug: `xyz${index}`,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          views: 0,
        },
        shortLink: `https://sink.test.com/xyz${index}`,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse("https://example1.com", 1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse("https://example2.com", 2),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse("https://example3.com", 3),
        });

      const testSink = new SinkClient();
      const results = await testSink.createMany([
        "https://example1.com",
        "https://example2.com",
        "https://example3.com",
      ]);

      expect(results).toEqual([
        { url: "https://example1.com", shortLink: "https://sink.test.com/xyz1" },
        { url: "https://example2.com", shortLink: "https://sink.test.com/xyz2" },
        { url: "https://example3.com", shortLink: "https://sink.test.com/xyz3" },
      ]);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should return original URLs when Sink is not configured", async () => {
      process.env.SINK_API_URL = "";

      const testSink = new SinkClient();
      const results = await testSink.createMany(["https://example1.com", "https://example2.com"]);

      expect(results).toEqual([
        { url: "https://example1.com", shortLink: null },
        { url: "https://example2.com", shortLink: null },
      ]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should handle empty URLs in the array", async () => {
      const mockResponse = {
        link: {
          id: "abc123",
          url: "https://example.com",
          slug: "xyz",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          views: 0,
        },
        shortLink: "https://sink.test.com/xyz",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const testSink = new SinkClient();
      const results = await testSink.createMany(["", "https://example.com", ""]);

      expect(results[0]).toEqual({ url: "", shortLink: null });
      expect(results[1]).toEqual({ url: "https://example.com", shortLink: "https://sink.test.com/xyz" });
      expect(results[2]).toEqual({ url: "", shortLink: null });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle partial failures gracefully", async () => {
      const mockSuccessResponse = {
        link: {
          id: "abc1",
          url: "https://example1.com",
          slug: "xyz1",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          views: 0,
        },
        shortLink: "https://sink.test.com/xyz1",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        })
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => "Server error",
        });

      const testSink = new SinkClient();
      const results = await testSink.createMany([
        "https://example1.com",
        "https://example2.com",
        "https://example3.com",
      ]);

      expect(results).toEqual([
        { url: "https://example1.com", shortLink: "https://sink.test.com/xyz1" },
        { url: "https://example2.com", shortLink: null },
        { url: "https://example3.com", shortLink: null },
      ]);
    });

    it("should handle empty array", async () => {
      const testSink = new SinkClient();
      const results = await testSink.createMany([]);

      expect(results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should process all URLs in parallel", async () => {
      const mockResponse = {
        link: {
          id: "abc",
          url: "https://example.com",
          slug: "xyz",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          views: 0,
        },
        shortLink: "https://sink.test.com/xyz",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const testSink = new SinkClient();
      const urls = Array(10).fill("https://example.com");

      await testSink.createMany(urls);

      expect(global.fetch).toHaveBeenCalledTimes(10);
    });
  });
});
