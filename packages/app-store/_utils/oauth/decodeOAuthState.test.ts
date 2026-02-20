import { createHmac, randomUUID } from "node:crypto";

import { describe, expect, it, vi, afterEach } from "vitest";

import { decodeOAuthState } from "./decodeOAuthState";

const TEST_SECRET = "test-nextauth-secret";
const TEST_USER_ID = 42;

function buildRequest({
  state,
  userId,
}: {
  state?: Record<string, unknown> | string;
  userId?: number | null;
}): Parameters<typeof decodeOAuthState>[0] {
  const query: Record<string, string> = {};
  if (state !== undefined) {
    query.state = typeof state === "string" ? state : JSON.stringify(state);
  }
  return {
    query,
    session: userId !== null ? { user: { id: userId ?? TEST_USER_ID } } : undefined,
  } as Parameters<typeof decodeOAuthState>[0];
}

function signNonce(nonce: string, userId: number, secret: string = TEST_SECRET): string {
  return createHmac("sha256", secret).update(`${nonce}:${userId}`).digest("hex");
}

function buildStateWithValidNonce(
  extra: Record<string, unknown> = {}
): Record<string, unknown> & { nonce: string; nonceHash: string } {
  const nonce = randomUUID();
  const nonceHash = signNonce(nonce, TEST_USER_ID);
  return { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true, nonce, nonceHash, ...extra };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("decodeOAuthState", () => {
  describe("when state query param is missing or not a string", () => {
    it("returns undefined for missing state", () => {
      const req = buildRequest({ state: undefined });
      delete (req.query as Record<string, unknown>).state;
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns undefined for non-string state", () => {
      const req = { query: { state: 123 }, session: { user: { id: TEST_USER_ID } } } as unknown as Parameters<
        typeof decodeOAuthState
      >[0];
      expect(decodeOAuthState(req)).toBeUndefined();
    });
  });

  describe("nonce-exempt apps", () => {
    const exemptApps = ["stripe", "basecamp3", "dub", "webex", "tandem"];

    it.each(exemptApps)("returns state without nonce verification for exempt app: %s", (slug) => {
      const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      const result = decodeOAuthState(req, slug);
      expect(result).toEqual(stateObj);
    });

    it("returns state for exempt app even when nonce fields are missing", () => {
      const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req, "stripe")).toEqual(stateObj);
    });
  });

  describe("mandatory nonce verification (non-exempt apps)", () => {
    it("returns undefined when nonce is missing", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns undefined when nonceHash is missing", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true, nonce: randomUUID() };
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns undefined when userId is missing", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const stateObj = buildStateWithValidNonce();
      const req = buildRequest({ state: stateObj, userId: null });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns undefined when NEXTAUTH_SECRET is not set", () => {
      vi.stubEnv("NEXTAUTH_SECRET", "");
      const stateObj = buildStateWithValidNonce();
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns state when nonce and HMAC are valid", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const stateObj = buildStateWithValidNonce();
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      const result = decodeOAuthState(req);
      expect(result).toEqual(stateObj);
    });

    it("returns undefined when nonceHash is tampered", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const stateObj = buildStateWithValidNonce();
      stateObj.nonceHash = "deadbeef".repeat(8);
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns undefined when nonce is tampered", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const stateObj = buildStateWithValidNonce();
      stateObj.nonce = randomUUID();
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns undefined when signed with a different userId", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const nonce = randomUUID();
      const nonceHash = signNonce(nonce, 999);
      const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true, nonce, nonceHash };
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("returns undefined when signed with a different secret", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const nonce = randomUUID();
      const nonceHash = createHmac("sha256", "wrong-secret").update(`${nonce}:${TEST_USER_ID}`).digest("hex");
      const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true, nonce, nonceHash };
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });

    it("prevents CSRF bypass by stripping nonce fields from non-exempt app", () => {
      vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
      const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
      const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
      expect(decodeOAuthState(req)).toBeUndefined();
    });
  });
});
