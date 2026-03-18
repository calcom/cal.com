import { describe, expect, it } from "vitest";

import {
  MAX_REDIRECT_URIS,
  isLoopbackAddress,
  isRedirectUriRegistered,
  validateRedirectUri,
  validateRedirectUris,
} from "./validateRedirectUris";

describe("isLoopbackAddress", () => {
  it("returns true for localhost", () => {
    expect(isLoopbackAddress("localhost")).toBe(true);
  });

  it("returns true for 127.0.0.1", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
  });

  it("returns true for [::1]", () => {
    expect(isLoopbackAddress("[::1]")).toBe(true);
  });

  it("returns false for a public hostname", () => {
    expect(isLoopbackAddress("example.com")).toBe(false);
  });

  it("returns false for 0.0.0.0", () => {
    expect(isLoopbackAddress("0.0.0.0")).toBe(false);
  });
});

describe("validateRedirectUri", () => {
  it("accepts HTTPS URLs", () => {
    expect(validateRedirectUri("https://example.com/callback")).toBe(true);
  });

  it("accepts HTTP for localhost", () => {
    expect(validateRedirectUri("http://localhost:3000/callback")).toBe(true);
  });

  it("accepts HTTP for 127.0.0.1", () => {
    expect(validateRedirectUri("http://127.0.0.1:8080/callback")).toBe(true);
  });

  it("accepts HTTP for [::1]", () => {
    expect(validateRedirectUri("http://[::1]:8080/callback")).toBe(true);
  });

  it("rejects HTTP for non-loopback addresses", () => {
    const result = validateRedirectUri("http://example.com/callback");
    expect(result).toContain("HTTPS is required");
  });

  it("rejects invalid URLs", () => {
    expect(validateRedirectUri("not-a-url")).toBe("Invalid URL");
  });

  it("rejects URLs with fragments", () => {
    const result = validateRedirectUri("https://example.com/callback#fragment");
    expect(result).toContain("fragments are not allowed");
  });
});

describe("validateRedirectUris", () => {
  it("accepts a valid array of HTTPS URIs", () => {
    expect(() =>
      validateRedirectUris(["https://example.com/callback", "https://example.com/callback2"])
    ).not.toThrow();
  });

  it("throws for empty array", () => {
    expect(() => validateRedirectUris([])).toThrow("At least one redirect URI is required");
  });

  it("throws when exceeding MAX_REDIRECT_URIS", () => {
    const uris = Array.from({ length: MAX_REDIRECT_URIS + 1 }, (_, i) => `https://example.com/cb${i}`);
    expect(() => validateRedirectUris(uris)).toThrow(`A maximum of ${MAX_REDIRECT_URIS} redirect URIs are allowed`);
  });

  it("accepts exactly MAX_REDIRECT_URIS URIs", () => {
    const uris = Array.from({ length: MAX_REDIRECT_URIS }, (_, i) => `https://example.com/cb${i}`);
    expect(() => validateRedirectUris(uris)).not.toThrow();
  });

  it("throws for duplicate URIs", () => {
    expect(() =>
      validateRedirectUris(["https://example.com/callback", "https://example.com/callback"])
    ).toThrow("Duplicate redirect URI");
  });

  it("throws for invalid URIs in array", () => {
    expect(() => validateRedirectUris(["https://example.com/callback", "not-a-url"])).toThrow("Invalid URL");
  });

  it("throws for HTTP non-loopback URIs in array", () => {
    expect(() =>
      validateRedirectUris(["https://example.com/callback", "http://example.com/other"])
    ).toThrow("HTTPS is required");
  });

  it("accepts mixed HTTPS and HTTP loopback URIs", () => {
    expect(() =>
      validateRedirectUris(["https://example.com/callback", "http://localhost:3000/callback"])
    ).not.toThrow();
  });
});

describe("isRedirectUriRegistered", () => {
  it("returns true for an exact match", () => {
    const registered = ["https://example.com/callback", "https://example.com/callback2"];
    expect(isRedirectUriRegistered("https://example.com/callback", registered)).toBe(true);
  });

  it("returns false when URI is not registered", () => {
    const registered = ["https://example.com/callback"];
    expect(isRedirectUriRegistered("https://example.com/other", registered)).toBe(false);
  });

  it("does not allow prefix matching", () => {
    const registered = ["https://example.com/callback"];
    expect(isRedirectUriRegistered("https://example.com/callback/extra", registered)).toBe(false);
  });

  it("returns false for empty registered array", () => {
    expect(isRedirectUriRegistered("https://example.com/callback", [])).toBe(false);
  });
});
