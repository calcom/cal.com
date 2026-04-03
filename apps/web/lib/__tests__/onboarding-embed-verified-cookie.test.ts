import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildOnboardingEmbedVerifiedCookie,
  verifyOnboardingEmbedVerifiedCookie,
  ONBOARDING_EMBED_VERIFIED_COOKIE_NAME,
} from "../onboarding-embed-verified-cookie";

const TEST_ENCRYPTION_KEY = "test-encryption-key-at-least-32chars!!";

describe("onboarding-embed-verified-cookie", () => {
  beforeEach(() => {
    vi.stubEnv("CALENDSO_ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("ONBOARDING_EMBED_VERIFIED_COOKIE_NAME", () => {
    it("should be 'onboarding-embed-verified'", () => {
      expect(ONBOARDING_EMBED_VERIFIED_COOKIE_NAME).toBe("onboarding-embed-verified");
    });
  });

  describe("buildOnboardingEmbedVerifiedCookie", () => {
    it("should return cookie with correct name", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      expect(cookie.name).toBe("onboarding-embed-verified");
    });

    it("should return cookie with maxAge of 1 hour", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      expect(cookie.maxAge).toBe(3600);
    });

    it("should return cookie value in format origin:timestamp.signature", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      const dotIndex = cookie.value.lastIndexOf(".");
      expect(dotIndex).toBeGreaterThan(0);

      const payload = cookie.value.slice(0, dotIndex);
      const signature = cookie.value.slice(dotIndex + 1);

      expect(payload).toMatch(/^https:\/\/example\.com:\d+$/);
      expect(signature).toMatch(/^[0-9a-f]+$/);
    });

    it("should produce different signatures for different origins", async () => {
      const cookie1 = await buildOnboardingEmbedVerifiedCookie("https://app1.com");
      const cookie2 = await buildOnboardingEmbedVerifiedCookie("https://app2.com");

      const sig1 = cookie1.value.slice(cookie1.value.lastIndexOf(".") + 1);
      const sig2 = cookie2.value.slice(cookie2.value.lastIndexOf(".") + 1);
      expect(sig1).not.toBe(sig2);
    });

    it("should throw if CALENDSO_ENCRYPTION_KEY is not set", async () => {
      vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "");
      await expect(buildOnboardingEmbedVerifiedCookie("https://example.com")).rejects.toThrow(
        "CALENDSO_ENCRYPTION_KEY is not set"
      );
    });
  });

  describe("verifyOnboardingEmbedVerifiedCookie", () => {
    it("should return the origin for a valid cookie", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      const origin = await verifyOnboardingEmbedVerifiedCookie(cookie.value);
      expect(origin).toBe("https://example.com");
    });

    it("should return null for undefined input", async () => {
      const origin = await verifyOnboardingEmbedVerifiedCookie(undefined);
      expect(origin).toBeNull();
    });

    it("should return null for empty string", async () => {
      const origin = await verifyOnboardingEmbedVerifiedCookie("");
      expect(origin).toBeNull();
    });

    it("should return null for value without dot separator", async () => {
      const origin = await verifyOnboardingEmbedVerifiedCookie("no-dot-here");
      expect(origin).toBeNull();
    });

    it("should return null for tampered signature", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      const tampered = cookie.value.slice(0, -4) + "dead";
      const origin = await verifyOnboardingEmbedVerifiedCookie(tampered);
      expect(origin).toBeNull();
    });

    it("should return null for tampered origin", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      const tampered = cookie.value.replace("https://example.com", "https://evil.com");
      const origin = await verifyOnboardingEmbedVerifiedCookie(tampered);
      expect(origin).toBeNull();
    });

    it("should return null for tampered timestamp", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      const dotIndex = cookie.value.lastIndexOf(".");
      const payload = cookie.value.slice(0, dotIndex);
      const signature = cookie.value.slice(dotIndex + 1);

      const colonIndex = payload.lastIndexOf(":");
      const tamperedPayload = payload.slice(0, colonIndex) + ":9999999999";
      const origin = await verifyOnboardingEmbedVerifiedCookie(`${tamperedPayload}.${signature}`);
      expect(origin).toBeNull();
    });

    it("should return null for expired cookie", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");
      const dotIndex = cookie.value.lastIndexOf(".");
      const payload = cookie.value.slice(0, dotIndex);
      const colonIndex = payload.lastIndexOf(":");
      const origin = payload.slice(0, colonIndex);

      // Build a cookie with a timestamp 2 hours ago
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 7200;
      const expiredCookie = await buildOnboardingEmbedVerifiedCookie(origin);
      // We can't easily fake the timestamp inside buildOnboardingEmbedVerifiedCookie,
      // so instead we test by mocking Date.now to simulate time passing
      const currentValue = expiredCookie.value;

      // Advance time by 2 hours
      const realDateNow = Date.now;
      vi.spyOn(Date, "now").mockReturnValue(realDateNow() + 2 * 60 * 60 * 1000 + 1000);

      const result = await verifyOnboardingEmbedVerifiedCookie(currentValue);
      expect(result).toBeNull();

      vi.restoreAllMocks();
    });

    it("should return origin for cookie that is not yet expired", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");

      // Advance time by 30 minutes (within 1 hour window)
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 30 * 60 * 1000);

      const origin = await verifyOnboardingEmbedVerifiedCookie(cookie.value);
      expect(origin).toBe("https://example.com");

      vi.restoreAllMocks();
    });

    it("should return null when signed with a different key", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("https://example.com");

      // Change the encryption key
      vi.stubEnv("CALENDSO_ENCRYPTION_KEY", "different-key-that-is-also-32chars!");

      const origin = await verifyOnboardingEmbedVerifiedCookie(cookie.value);
      expect(origin).toBeNull();
    });

    it("should handle origin with port number", async () => {
      const cookie = await buildOnboardingEmbedVerifiedCookie("http://localhost:4322");
      const origin = await verifyOnboardingEmbedVerifiedCookie(cookie.value);
      expect(origin).toBe("http://localhost:4322");
    });
  });
});
