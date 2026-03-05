import { describe, it, expect } from "vitest";

import { getTokenObjectFromCredential } from "./getTokenObjectFromCredential";

describe("getTokenObjectFromCredential", () => {
  it("should parse valid token object from credential key", () => {
    const credential = {
      id: 1,
      key: {
        access_token: "abc123",
        refresh_token: "refresh_abc",
        expiry_date: 1700000000000,
      },
    };
    const result = getTokenObjectFromCredential(credential);
    expect(result.access_token).toBe("abc123");
    expect(result.refresh_token).toBe("refresh_abc");
    expect(result.expiry_date).toBe(1700000000000);
  });

  it("should throw when key has invalid format", () => {
    const credential = {
      id: 2,
      key: { invalid: "data" },
    };
    expect(() => getTokenObjectFromCredential(credential)).toThrow();
  });

  it("should throw when key is null", () => {
    const credential = {
      id: 3,
      key: null,
    };
    // null key should be handled by the nullable schema - it returns null data
    // but then the function throws because tokenResponse is null
    expect(() => getTokenObjectFromCredential(credential)).toThrow(
      "credential.key is not set for credential 3"
    );
  });

  it("should preserve extra passthrough fields", () => {
    const credential = {
      id: 4,
      key: {
        access_token: "abc123",
        expiry_date: 1700000000000,
        custom_field: "preserved",
      },
    };
    const result = getTokenObjectFromCredential(credential);
    expect(result.access_token).toBe("abc123");
    expect((result as Record<string, unknown>).custom_field).toBe("preserved");
  });
});
