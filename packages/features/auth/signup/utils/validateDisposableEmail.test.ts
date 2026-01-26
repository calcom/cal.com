import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDisposableOrBlockedRelayEmail, validateDisposableEmail } from "./validateDisposableEmail";

// Mock the disposable-email-domains-js package
const mockIsDisposable = vi.fn();
vi.mock("disposable-email-domains-js", () => ({
  isDisposable: (email: string) => mockIsDisposable(email),
}));

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
    mockIsDisposable.mockReset();
    mockIsDisposable.mockReturnValue(false);
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
      mockIsDisposable.mockReturnValue(false);

      const result = await validateDisposableEmail("test@privaterelay.appleid.com");
      expect(result.isBlockedRelay).toBe(false);
      expect(result.isDisposable).toBe(false);
    });

    it("should allow iCloud emails", async () => {
      mockIsDisposable.mockReturnValue(false);

      const result = await validateDisposableEmail("test@icloud.com");
      expect(result.isBlockedRelay).toBe(false);
      expect(result.isDisposable).toBe(false);
    });
  });

  describe("disposable email detection via local list", () => {
    it("should detect disposable emails from local domain list", async () => {
      mockIsDisposable.mockReturnValue(true);

      const result = await validateDisposableEmail("test@mailinator.com");
      expect(result.isDisposable).toBe(true);
      expect(result.isBlockedRelay).toBe(false);
    });

    it("should allow legitimate emails", async () => {
      mockIsDisposable.mockReturnValue(false);

      const result = await validateDisposableEmail("test@gmail.com");
      expect(result.isDisposable).toBe(false);
      expect(result.isBlockedRelay).toBe(false);
    });

    it("should fail open when local check throws", async () => {
      mockIsDisposable.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

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
    mockIsDisposable.mockReset();
    mockIsDisposable.mockReturnValue(false);
  });

  it("should return true for blocked relay emails", async () => {
    const result = await isDisposableOrBlockedRelayEmail("test@duck.com");
    expect(result).toBe(true);
  });

  it("should return true for disposable emails", async () => {
    mockIsDisposable.mockReturnValue(true);

    const result = await isDisposableOrBlockedRelayEmail("test@mailinator.com");
    expect(result).toBe(true);
  });

  it("should return false for legitimate emails", async () => {
    mockIsDisposable.mockReturnValue(false);

    const result = await isDisposableOrBlockedRelayEmail("test@gmail.com");
    expect(result).toBe(false);
  });

  it("should return false for Apple relay emails", async () => {
    mockIsDisposable.mockReturnValue(false);

    const result = await isDisposableOrBlockedRelayEmail("test@privaterelay.appleid.com");
    expect(result).toBe(false);
  });
});
