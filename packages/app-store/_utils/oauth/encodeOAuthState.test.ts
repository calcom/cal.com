import { createHmac } from "node:crypto";

import { describe, expect, it, vi, afterEach } from "vitest";

import { encodeOAuthState } from "./encodeOAuthState";

const TEST_SECRET = "test-nextauth-secret";
const TEST_USER_ID = 42;

function buildRequest({
  state,
  userId,
}: {
  state?: Record<string, unknown> | string;
  userId?: number | null;
}): Parameters<typeof encodeOAuthState>[0] {
  const query: Record<string, string> = {};
  if (state !== undefined) {
    query.state = typeof state === "string" ? state : JSON.stringify(state);
  }
  return {
    query,
    session: userId !== null ? { user: { id: userId ?? TEST_USER_ID } } : undefined,
  } as Parameters<typeof encodeOAuthState>[0];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("encodeOAuthState", () => {
  it("returns undefined when state query param is missing", () => {
    const req = buildRequest({ state: undefined });
    delete (req.query as Record<string, unknown>).state;
    expect(encodeOAuthState(req)).toBeUndefined();
  });

  it("returns JSON string preserving original state fields", () => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
    const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
    const result = encodeOAuthState(req);
    expect(result).toBeDefined();
    const parsed = JSON.parse(result!);
    expect(parsed.returnTo).toBe("/apps");
    expect(parsed.onErrorReturnTo).toBe("/error");
    expect(parsed.fromApp).toBe(true);
  });

  it("injects nonce and nonceHash when userId and secret are available", () => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
    const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
    const result = encodeOAuthState(req);
    const parsed = JSON.parse(result!);
    expect(parsed.nonce).toBeDefined();
    expect(typeof parsed.nonce).toBe("string");
    expect(parsed.nonceHash).toBeDefined();
    expect(typeof parsed.nonceHash).toBe("string");
  });

  it("produces a valid HMAC that matches manual computation", () => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
    const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
    const result = encodeOAuthState(req);
    const parsed = JSON.parse(result!);
    const expectedHash = createHmac("sha256", TEST_SECRET)
      .update(`${parsed.nonce}:${TEST_USER_ID}`)
      .digest("hex");
    expect(parsed.nonceHash).toBe(expectedHash);
  });

  it("does not inject nonce when userId is missing", () => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
    const req = buildRequest({ state: stateObj, userId: null });
    const result = encodeOAuthState(req);
    const parsed = JSON.parse(result!);
    expect(parsed.nonce).toBeUndefined();
    expect(parsed.nonceHash).toBeUndefined();
  });

  it("does not inject nonce when NEXTAUTH_SECRET is not set", () => {
    vi.stubEnv("NEXTAUTH_SECRET", "");
    const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
    const req = buildRequest({ state: stateObj, userId: TEST_USER_ID });
    const result = encodeOAuthState(req);
    const parsed = JSON.parse(result!);
    expect(parsed.nonce).toBeUndefined();
    expect(parsed.nonceHash).toBeUndefined();
  });

  it("generates unique nonces per call", () => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    const stateObj = { returnTo: "/apps", onErrorReturnTo: "/error", fromApp: true };
    const req1 = buildRequest({ state: stateObj, userId: TEST_USER_ID });
    const req2 = buildRequest({ state: stateObj, userId: TEST_USER_ID });
    const result1 = JSON.parse(encodeOAuthState(req1)!);
    const result2 = JSON.parse(encodeOAuthState(req2)!);
    expect(result1.nonce).not.toBe(result2.nonce);
    expect(result1.nonceHash).not.toBe(result2.nonceHash);
  });
});
