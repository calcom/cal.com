import { describe, expect, it } from "vitest";

import {
  isBlockedHostname,
  isPrivateIP,
  isTrustedInternalUrl,
  validateUrlForSSRFSync,
} from "./ssrfProtection";

describe("isPrivateIP", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "169.254.169.254", // AWS metadata
    "0.0.0.0",
    "100.64.0.1", // RFC 6598 CGNAT start
    "100.127.255.254", // RFC 6598 CGNAT end
  ])("blocks private IPv4 %s", (ip) => {
    expect(isPrivateIP(ip)).toBe(true);
  });

  it.each([
    "172.15.255.255", // just outside 172.16.0.0/12
    "172.32.0.0", // just outside 172.16.0.0/12
    "8.8.8.8", // Google DNS
    "1.1.1.1", // Cloudflare DNS
    "100.63.255.255", // just below RFC 6598
    "100.128.0.0", // just above RFC 6598
  ])("allows public IPv4 %s", (ip) => {
    expect(isPrivateIP(ip)).toBe(false);
  });

  it.each(["::1", "::", "fc00::1", "fd00::1", "fe80::1"])("blocks private IPv6 %s", (ip) => {
    expect(isPrivateIP(ip)).toBe(true);
  });

  it("allows public IPv6 addresses", () => {
    expect(isPrivateIP("2001:4860:4860::8888")).toBe(false); // Google DNS
  });

  it("blocks IPv4-mapped IPv6 addresses", () => {
    expect(isPrivateIP("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIP("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateIP("::ffff:8.8.8.8")).toBe(false);
  });
});

describe("isBlockedHostname", () => {
  it.each([
    "localhost", // loopback hostname
    "169.254.169.254", // AWS/Azure/DigitalOcean
    "metadata.google.internal", // GCP
    "169.254.169.254.", // trailing dot normalization
    "METADATA.GOOGLE.INTERNAL", // case insensitive
  ])("blocks cloud metadata endpoint %s", (hostname) => {
    expect(isBlockedHostname(hostname)).toBe(true);
  });

  it("allows regular hostnames", () => {
    expect(isBlockedHostname("example.com")).toBe(false);
  });
});

describe("validateUrlForSSRFSync", () => {
  it("allows HTTPS URLs", () => {
    expect(validateUrlForSSRFSync("https://example.com/logo.png").isValid).toBe(true);
  });

  it("allows image data URLs", () => {
    expect(validateUrlForSSRFSync("data:image/png;base64,iVBORw0KGgo=").isValid).toBe(true);
  });

  it.each([
    ["http://example.com/logo.png", "Only HTTPS URLs are allowed"],
    ["ftp://example.com/file", "Only HTTPS URLs are allowed"],
    ["data:text/html,<script>alert(1)</script>", "Non-image data URL"],
    ["https://127.0.0.1/logo.png", "Private IP address"],
    ["https://169.254.169.254/latest/meta-data/", "Blocked hostname"],
    ["https://localhost/logo.png", "Blocked hostname"],
    ["not-a-url", "Invalid URL format"],
  ])("blocks %s", (url, expectedError) => {
    const result = validateUrlForSSRFSync(url);
    expect(result).toEqual({ isValid: false, error: expectedError });
  });

  it.each([
    ["https://[::1]/", "Private IP address"],
    ["https://[fe80::1]/path", "Private IP address"],
    ["https://[fc00::1]:8080/", "Private IP address"],
    ["https://[::ffff:127.0.0.1]/", "Private IP address"],
  ])("blocks IPv6 private addresses with brackets %s", (url, expectedError) => {
    const result = validateUrlForSSRFSync(url);
    expect(result).toEqual({ isValid: false, error: expectedError });
  });

  it("allows public IPv6 addresses", () => {
    expect(validateUrlForSSRFSync("https://[2001:4860:4860::8888]/").isValid).toBe(true);
  });
});

describe("isTrustedInternalUrl", () => {
  const webappUrl = "https://app.cal.com";

  it("returns true for same origin", () => {
    expect(isTrustedInternalUrl("https://app.cal.com/logo.png", webappUrl)).toBe(true);
  });

  it("returns false for different origins and invalid URLs", () => {
    expect(isTrustedInternalUrl("https://evil.com/logo.png", webappUrl)).toBe(false);
    expect(isTrustedInternalUrl("https://app.cal.com.evil.com/x", webappUrl)).toBe(false);
    expect(isTrustedInternalUrl("not-a-url", webappUrl)).toBe(false);
  });
});
