import { createHmac } from "node:crypto";
import type { NextApiRequest } from "next";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { decodeOAuthState } from "./decodeOAuthState";

describe("decodeOAuthState", () => {
  const mockUserId = 123;
  const mockSecret = "test-secret";

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = mockSecret;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  function createMockRequest(state: string | undefined, userId?: number): NextApiRequest {
    return {
      query: { state },
      session: userId ? { user: { id: userId } } : undefined,
    } as unknown as NextApiRequest;
  }

  function createValidNonceHash(nonce: string, userId: number, secret: string): string {
    return createHmac("sha256", secret).update(`${nonce}:${userId}`).digest("hex");
  }

  describe("malformed JSON handling", () => {
    test("returns undefined when state is malformed JSON", () => {
      const req = createMockRequest("not-valid-json", mockUserId);
      const result = decodeOAuthState(req);
      expect(result).toBeUndefined();
    });

    test("returns undefined when state is empty string", () => {
      const req = createMockRequest("", mockUserId);
      const result = decodeOAuthState(req);
      expect(result).toBeUndefined();
    });

    test("returns undefined when state contains incomplete JSON", () => {
      const req = createMockRequest('{"incomplete":', mockUserId);
      const result = decodeOAuthState(req);
      expect(result).toBeUndefined();
    });

    test("returns undefined when state contains invalid escape sequences", () => {
      const req = createMockRequest('{"key":"\\x"}', mockUserId);
      const result = decodeOAuthState(req);
      expect(result).toBeUndefined();
    });
  });

  describe("type validation", () => {
    test("returns undefined when state is not a string", () => {
      const req = {
        query: { state: 123 },
        session: { user: { id: mockUserId } },
      } as unknown as NextApiRequest;
      const result = decodeOAuthState(req);
      expect(result).toBeUndefined();
    });

    test("returns undefined when state is undefined", () => {
      const req = createMockRequest(undefined, mockUserId);
      const result = decodeOAuthState(req);
      expect(result).toBeUndefined();
    });
  });

  describe("nonce-exempt apps", () => {
    test("returns state for stripe without nonce validation", () => {
      const state = { fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "stripe");
      expect(result).toEqual(state);
    });

    test("returns state for basecamp3 without nonce validation", () => {
      const state = { fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "basecamp3");
      expect(result).toEqual(state);
    });

    test("returns state for dub without nonce validation", () => {
      const state = { fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "dub");
      expect(result).toEqual(state);
    });

    test("returns state for webex without nonce validation", () => {
      const state = { fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "webex");
      expect(result).toEqual(state);
    });

    test("returns state for tandem without nonce validation", () => {
      const state = { fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "tandem");
      expect(result).toEqual(state);
    });
  });

  describe("nonce validation", () => {
    test("returns undefined when nonce is missing", () => {
      const state = { nonceHash: "somehash", fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "google-calendar");
      expect(result).toBeUndefined();
    });

    test("returns undefined when nonceHash is missing", () => {
      const state = { nonce: "somenonce", fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "google-calendar");
      expect(result).toBeUndefined();
    });

    test("returns undefined when user is not authenticated", () => {
      const nonce = "test-nonce";
      const nonceHash = createValidNonceHash(nonce, mockUserId, mockSecret);
      const state = { nonce, nonceHash, fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), undefined);
      const result = decodeOAuthState(req, "google-calendar");
      expect(result).toBeUndefined();
    });

    test("returns undefined when NEXTAUTH_SECRET is not set", () => {
      delete process.env.NEXTAUTH_SECRET;
      const nonce = "test-nonce";
      const nonceHash = createValidNonceHash(nonce, mockUserId, mockSecret);
      const state = { nonce, nonceHash, fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "google-calendar");
      expect(result).toBeUndefined();
    });

    test("returns undefined when nonce hash is invalid", () => {
      const state = {
        nonce: "test-nonce",
        nonceHash: "invalid-hash",
        fromRedirectUrl: "https://example.com",
      };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "google-calendar");
      expect(result).toBeUndefined();
    });

    test("returns state when nonce validation succeeds", () => {
      const nonce = "test-nonce";
      const nonceHash = createValidNonceHash(nonce, mockUserId, mockSecret);
      const state = { nonce, nonceHash, fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId);
      const result = decodeOAuthState(req, "google-calendar");
      expect(result).toEqual(state);
    });

    test("returns undefined when userId in request does not match nonce hash", () => {
      const nonce = "test-nonce";
      const nonceHash = createValidNonceHash(nonce, mockUserId, mockSecret);
      const state = { nonce, nonceHash, fromRedirectUrl: "https://example.com" };
      const req = createMockRequest(JSON.stringify(state), mockUserId + 1);
      const result = decodeOAuthState(req, "google-calendar");
      expect(result).toBeUndefined();
    });
  });

  describe("DoS attack prevention", () => {
    test("handles extremely large JSON without crashing", () => {
      const largeObject = { data: "x".repeat(10000) };
      const req = createMockRequest(JSON.stringify(largeObject), mockUserId);
      const result = decodeOAuthState(req);
      // Should return undefined because nonce/nonceHash are missing
      expect(result).toBeUndefined();
    });

    test("handles deeply nested JSON without crashing", () => {
      let nested: Record<string, unknown> = { value: "end" };
      for (let i = 0; i < 100; i++) {
        nested = { nested };
      }
      const req = createMockRequest(JSON.stringify(nested), mockUserId);
      const result = decodeOAuthState(req);
      expect(result).toBeUndefined();
    });
  });
});
