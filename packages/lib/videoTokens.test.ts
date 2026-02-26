import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateVideoToken, verifyVideoToken } from "./videoTokens";

describe("videoTokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
    vi.stubEnv("CAL_VIDEO_RECORDING_TOKEN_SECRET", "test-secret-key");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe("generateVideoToken", () => {
    it("returns token with recordingId:expires:hmac format", () => {
      const token = generateVideoToken("rec_123");
      const parts = token.split(":");

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe("rec_123");
    });

    it("sets expiration based on expiresInMinutes parameter", () => {
      const token = generateVideoToken("rec_123", 60);
      const parts = token.split(":");
      const expires = parseInt(parts[1], 10);
      const expectedExpires = Date.now() + 60 * 60 * 1000;

      expect(expires).toBe(expectedExpires);
    });

    it("defaults to ~6 months expiration", () => {
      const token = generateVideoToken("rec_123");
      const parts = token.split(":");
      const expires = parseInt(parts[1], 10);
      const expectedExpires = Date.now() + 262992 * 60 * 1000;

      expect(expires).toBe(expectedExpires);
    });

    it("produces different HMAC for different recording IDs", () => {
      const token1 = generateVideoToken("rec_1");
      const token2 = generateVideoToken("rec_2");

      const hmac1 = token1.split(":")[2];
      const hmac2 = token2.split(":")[2];

      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe("verifyVideoToken", () => {
    it("verifies a valid token successfully", () => {
      const token = generateVideoToken("rec_verify");
      const result = verifyVideoToken(token);

      expect(result).toEqual({ valid: true, recordingId: "rec_verify" });
    });

    it("returns invalid for expired token", () => {
      const token = generateVideoToken("rec_expired", 1);
      // Advance time past expiration
      vi.advanceTimersByTime(2 * 60 * 1000);

      const result = verifyVideoToken(token);
      expect(result).toEqual({ valid: false });
    });

    it("returns invalid for tampered HMAC", () => {
      const token = generateVideoToken("rec_tamper");
      const parts = token.split(":");
      const tamperedToken = `${parts[0]}:${parts[1]}:tampered_hmac`;

      const result = verifyVideoToken(tamperedToken);
      expect(result).toEqual({ valid: false });
    });

    it("returns invalid for malformed token", () => {
      const result = verifyVideoToken("not-a-valid-token");
      expect(result).toEqual({ valid: false });
    });

    it("returns invalid for empty string", () => {
      const result = verifyVideoToken("");
      expect(result).toEqual({ valid: false });
    });

    it("uses environment variable for secret", () => {
      const token = generateVideoToken("rec_env");
      const result = verifyVideoToken(token);
      expect(result.valid).toBe(true);

      // Change secret - token should now fail
      vi.stubEnv("CAL_VIDEO_RECORDING_TOKEN_SECRET", "different-secret");
      const result2 = verifyVideoToken(token);
      expect(result2.valid).toBe(false);
    });
  });
});
