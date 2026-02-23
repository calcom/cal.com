import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SinkClient } from "../providers/SinkClient";
import { SinkShortener } from "../providers/SinkShortener";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

function createMockClient(overrides: Partial<SinkClient> = {}): SinkClient {
  return {
    isConfigured: vi.fn().mockReturnValue(true),
    createLink: vi.fn(),
    createMany: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as SinkClient;
}

describe("SinkShortener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  describe("isConfigured", () => {
    it("returns true when both SINK_API_URL and SINK_API_KEY are set", () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "test-key");
      expect(SinkShortener.isConfigured()).toBe(true);
    });

    it("returns false when SINK_API_URL is missing", () => {
      vi.stubEnv("SINK_API_URL", "");
      vi.stubEnv("SINK_API_KEY", "test-key");
      expect(SinkShortener.isConfigured()).toBe(false);
    });

    it("returns false when SINK_API_KEY is missing", () => {
      vi.stubEnv("SINK_API_URL", "https://sink.test.com");
      vi.stubEnv("SINK_API_KEY", "");
      expect(SinkShortener.isConfigured()).toBe(false);
    });
  });

  describe("shortenMany", () => {
    it("returns shortened links from client", async () => {
      const client = createMockClient({
        createMany: vi
          .fn()
          .mockResolvedValue([{ url: "https://example.com", shortLink: "https://sink.test.com/abc" }]),
      });
      const shortener = new SinkShortener(client);

      const result = await shortener.shortenMany(["https://example.com"]);

      expect(result).toEqual([{ shortLink: "https://sink.test.com/abc" }]);
    });

    it("falls back to original URL when shortLink is null", async () => {
      const client = createMockClient({
        createMany: vi.fn().mockResolvedValue([{ url: "https://example.com", shortLink: null }]),
      });
      const shortener = new SinkShortener(client);

      const result = await shortener.shortenMany(["https://example.com"]);

      expect(result).toEqual([{ shortLink: "https://example.com" }]);
    });

    it("returns original URLs on client error", async () => {
      const client = createMockClient({
        createMany: vi.fn().mockRejectedValue(new Error("API error")),
      });
      const shortener = new SinkShortener(client);

      const result = await shortener.shortenMany(["https://example1.com", "https://example2.com"]);

      expect(result).toEqual([{ shortLink: "https://example1.com" }, { shortLink: "https://example2.com" }]);
    });

    it("ignores options parameter", async () => {
      const mockCreateMany = vi
        .fn()
        .mockResolvedValue([{ url: "https://example.com", shortLink: "https://sink.test.com/abc" }]);
      const client = createMockClient({ createMany: mockCreateMany });
      const shortener = new SinkShortener(client);

      await shortener.shortenMany(["https://example.com"], { domain: "custom.com", folderId: "folder123" });

      expect(mockCreateMany).toHaveBeenCalledWith(["https://example.com"]);
    });
  });
});
