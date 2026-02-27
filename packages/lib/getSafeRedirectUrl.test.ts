import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSafeRedirectUrl, isSafeUrlToLoadResourceFrom } from "./getSafeRedirectUrl";

vi.mock("./constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
  WEBSITE_URL: "https://cal.com",
  CONSOLE_URL: "https://console.cal.com",
  EMBED_LIB_URL: "https://embed.com",
}));

describe("isSafeUrlToLoadResourceFrom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("should return true for URLs with same TLD+1 as WEBAPP_URL", () => {
    expect(isSafeUrlToLoadResourceFrom("https://acme.cal.com/path")).toBe(true);
    expect(isSafeUrlToLoadResourceFrom("http://dunder.cal.com?query=1")).toBe(true);
    expect(isSafeUrlToLoadResourceFrom("https://cal.com/path")).toBe(true);
  });

  it("should return true for URLs with same TLD+1 as EMBED_LIB_URL", () => {
    expect(isSafeUrlToLoadResourceFrom("https://test.embed.com/path")).toBe(true);
    expect(isSafeUrlToLoadResourceFrom("http://embed.com/script.js")).toBe(true);
  });

  it("should return true for localhost URLs", () => {
    expect(isSafeUrlToLoadResourceFrom("http://localhost:3000")).toBe(true);
    expect(isSafeUrlToLoadResourceFrom("http://127.0.0.1:3000")).toBe(true);
  });

  it("should return false for different TLD+1", () => {
    expect(isSafeUrlToLoadResourceFrom("https://malicious1.com")).toBe(false);
    expect(isSafeUrlToLoadResourceFrom("https://malicious2.com")).toBe(false);
  });

  it("should return false for non-http/https protocols", () => {
    expect(isSafeUrlToLoadResourceFrom("ftp://example.com")).toBe(false);
    expect(isSafeUrlToLoadResourceFrom("javascript:alert(1)")).toBe(false);
    expect(isSafeUrlToLoadResourceFrom("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("should return false for invalid URLs", () => {
    expect(isSafeUrlToLoadResourceFrom("not-a-url")).toBe(false);
    expect(isSafeUrlToLoadResourceFrom("http://")).toBe(false);
  });
});

describe("getSafeRedirectUrl", () => {
  it("returns null for empty string", () => {
    expect(getSafeRedirectUrl("")).toBeNull();
  });

  it("returns null for undefined (default parameter)", () => {
    expect(getSafeRedirectUrl()).toBeNull();
  });

  it("throws Error('Pass an absolute URL') for non-http URLs", () => {
    expect(() => getSafeRedirectUrl("foo.com")).toThrow("Pass an absolute URL");
    expect(() => getSafeRedirectUrl("/path")).toThrow("Pass an absolute URL");
    expect(() => getSafeRedirectUrl("javascript:alert(1)")).toThrow("Pass an absolute URL");
    expect(() => getSafeRedirectUrl("ftp://example.com")).toThrow("Pass an absolute URL");
  });

  it("returns the original URL when origin matches WEBAPP_URL", () => {
    expect(getSafeRedirectUrl("https://app.cal.com/some-path")).toBe("https://app.cal.com/some-path");
  });

  it("returns the original URL when origin matches WEBSITE_URL", () => {
    expect(getSafeRedirectUrl("https://cal.com/pricing")).toBe("https://cal.com/pricing");
  });

  it("returns the original URL when origin matches CONSOLE_URL", () => {
    expect(getSafeRedirectUrl("https://console.cal.com/settings")).toBe("https://console.cal.com/settings");
  });

  it("redirects to WEBAPP_URL/ when origin does not match any allowed domain", () => {
    expect(getSafeRedirectUrl("https://evil.com/phish")).toBe("https://app.cal.com/");
    expect(getSafeRedirectUrl("https://malicious.org")).toBe("https://app.cal.com/");
  });
});
