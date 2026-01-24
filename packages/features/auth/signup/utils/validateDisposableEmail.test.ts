import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { validateDisposableEmail, isDisposableOrBlockedRelayEmail } from "./validateDisposableEmail";

// Mock the global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the logger
vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

describe("validateDisposableEmail", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("blocked relay domains", () => {
    it("should block DuckDuckGo email protection (duck.com)", async () => {
      const result = await validateDisposableEmail("test@duck.com");
      expect(result.isBlockedRelay).toBe(true);
      expect(result.isDisposable).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should block Firefox Relay emails", async () => {
      const result = await validateDisposableEmail("test@relay.firefox.com");
      expect(result.isBlockedRelay).toBe(true);

      const result2 = await validateDisposableEmail("test@mozmail.com");
      expect(result2.isBlockedRelay).toBe(true);
    });

    it("should block SimpleLogin emails", async () => {
      const result = await validateDisposableEmail("test@simplelogin.com");
      expect(result.isBlockedRelay).toBe(true);
    });

    it("should block AnonAddy/Addy.io emails", async () => {
      const result = await validateDisposableEmail("test@anonaddy.com");
      expect(result.isBlockedRelay).toBe(true);

      const result2 = await validateDisposableEmail("test@addy.io");
      expect(result2.isBlockedRelay).toBe(true);
    });

    it("should allow Apple Hide My Email (privaterelay.appleid.com)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ disposable: "false" }),
      });

      const result = await validateDisposableEmail("test@privaterelay.appleid.com");
      expect(result.isBlockedRelay).toBe(false);
      expect(result.isDisposable).toBe(false);
    });

    it("should allow iCloud emails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ disposable: "false" }),
      });

      const result = await validateDisposableEmail("test@icloud.com");
      expect(result.isBlockedRelay).toBe(false);
      expect(result.isDisposable).toBe(false);
    });
  });

  describe("disposable email detection via API", () => {
    it("should detect disposable emails from DeBounce API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ disposable: "true" }),
      });

      const result = await validateDisposableEmail("test@mailinator.com");
      expect(result.isDisposable).toBe(true);
      expect(result.isBlockedRelay).toBe(false);
    });

    it("should allow legitimate emails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ disposable: "false" }),
      });

      const result = await validateDisposableEmail("test@gmail.com");
      expect(result.isDisposable).toBe(false);
      expect(result.isBlockedRelay).toBe(false);
    });

    it("should fail open when API returns error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await validateDisposableEmail("test@unknown.com");
      expect(result.isDisposable).toBe(false);
      expect(result.isBlockedRelay).toBe(false);
    });

    it("should fail open when API throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await validateDisposableEmail("test@unknown.com");
      expect(result.isDisposable).toBe(false);
      expect(result.isBlockedRelay).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty email", async () => {
      const result = await validateDisposableEmail("");
      expect(result.isDisposable).toBe(false);
      expect(result.isBlockedRelay).toBe(false);
    });

    it("should handle email without domain", async () => {
      const result = await validateDisposableEmail("nodomain");
      expect(result.isDisposable).toBe(false);
      expect(result.isBlockedRelay).toBe(false);
    });

    it("should handle subdomains of blocked relay domains", async () => {
      const result = await validateDisposableEmail("test@subdomain.duck.com");
      expect(result.isBlockedRelay).toBe(true);
    });
  });
});

describe("isDisposableOrBlockedRelayEmail", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should return true for blocked relay emails", async () => {
    const result = await isDisposableOrBlockedRelayEmail("test@duck.com");
    expect(result).toBe(true);
  });

  it("should return true for disposable emails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ disposable: "true" }),
    });

    const result = await isDisposableOrBlockedRelayEmail("test@mailinator.com");
    expect(result).toBe(true);
  });

  it("should return false for legitimate emails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ disposable: "false" }),
    });

    const result = await isDisposableOrBlockedRelayEmail("test@gmail.com");
    expect(result).toBe(false);
  });

  it("should return false for Apple relay emails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ disposable: "false" }),
    });

    const result = await isDisposableOrBlockedRelayEmail("test@privaterelay.appleid.com");
    expect(result).toBe(false);
  });
});
