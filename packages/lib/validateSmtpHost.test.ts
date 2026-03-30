import dns from "node:dns/promises";

import { describe, expect, it, vi, beforeEach } from "vitest";

import { resolveAndValidateSmtpHost, validateSmtpHost } from "./validateSmtpHost";

// Mock IS_SELF_HOSTED -- default to SaaS (false)
vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return {
    ...actual,
    IS_SELF_HOSTED: false,
  };
});

// Re-import so we can mutate the mock between tests
import * as constants from "@calcom/lib/constants";

vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn() },
}));

describe("validateSmtpHost", () => {
  describe("SaaS mode (IS_SELF_HOSTED = false)", () => {
    beforeEach(() => {
      vi.mocked(constants).IS_SELF_HOSTED = false as unknown as boolean;
    });

    describe("blocks dangerous addresses", () => {
      it.each([
        ["127.0.0.1", "IPv4 loopback"],
        ["127.0.0.2", "IPv4 loopback alternate"],
        ["169.254.169.254", "cloud metadata endpoint"],
        ["169.254.0.1", "link-local"],
        ["0.0.0.0", "this-network"],
        ["0.1.2.3", "this-network alternate"],
        ["::1", "IPv6 loopback"],
        ["0:0:0:0:0:0:0:1", "IPv6 loopback expanded"],
        ["0000:0000:0000:0000:0000:0000:0000:0001", "IPv6 loopback fully expanded"],
        ["fe80::1", "IPv6 link-local"],
        ["::ffff:127.0.0.1", "IPv4-mapped loopback"],
        ["::ffff:169.254.169.254", "IPv4-mapped metadata"],
        ["localhost", "localhost hostname"],
        ["metadata.google.internal", "GCP metadata"],
        ["metadata.internal", "generic metadata"],
        ["instance-data", "AWS instance data"],
      ])("rejects %s (%s)", (host) => {
        expect(validateSmtpHost(host)).toBe(false);
      });
    });

    describe("blocks RFC-1918 on SaaS", () => {
      it.each([
        ["10.0.0.1", "Class A private"],
        ["192.168.1.100", "Class C private"],
        ["172.16.0.5", "Class B private"],
      ])("rejects %s (%s)", (host) => {
        expect(validateSmtpHost(host)).toBe(false);
      });
    });

    describe("allows legitimate SMTP hosts", () => {
      it.each([
        ["email-smtp.us-east-1.amazonaws.com", "AWS SES"],
        ["smtp.gmail.com", "Gmail"],
        ["smtp.office365.com", "Office 365"],
        ["smtp.sendgrid.net", "SendGrid"],
        ["mail.example.com", "custom domain"],
        ["52.94.253.1", "public IP"],
      ])("allows %s (%s)", (host) => {
        expect(validateSmtpHost(host)).toBe(true);
      });
    });
  });

  describe("self-hosted mode (IS_SELF_HOSTED = true)", () => {
    beforeEach(() => {
      vi.mocked(constants).IS_SELF_HOSTED = true as unknown as boolean;
    });

    it("allows RFC-1918 for internal SMTP relays", () => {
      expect(validateSmtpHost("10.0.0.1")).toBe(true);
      expect(validateSmtpHost("192.168.1.100")).toBe(true);
      expect(validateSmtpHost("172.16.0.5")).toBe(true);
    });

    it("still blocks loopback and metadata", () => {
      expect(validateSmtpHost("127.0.0.1")).toBe(false);
      expect(validateSmtpHost("::1")).toBe(false);
      expect(validateSmtpHost("169.254.169.254")).toBe(false);
      expect(validateSmtpHost("localhost")).toBe(false);
    });
  });

  it("trims whitespace", () => {
    expect(validateSmtpHost("  127.0.0.1  ")).toBe(false);
    expect(validateSmtpHost("  smtp.gmail.com  ")).toBe(true);
  });

  it("is case-insensitive for hostnames", () => {
    expect(validateSmtpHost("LOCALHOST")).toBe(false);
    expect(validateSmtpHost("Metadata.Google.Internal")).toBe(false);
  });
});

describe("resolveAndValidateSmtpHost", () => {
  beforeEach(() => {
    vi.mocked(constants).IS_SELF_HOSTED = false as unknown as boolean;
    vi.mocked(dns.lookup).mockReset();
  });

  it("rejects hosts that fail sync validation", async () => {
    const result = await resolveAndValidateSmtpHost("127.0.0.1");
    expect(result.valid).toBe(false);
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it("skips DNS lookup for IP literals", async () => {
    expect(validateSmtpHost("52.94.253.1")).toBe(true);
    const result = await resolveAndValidateSmtpHost("52.94.253.1");
    expect(result.valid).toBe(true);
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it("detects DNS rebinding to private IP", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "169.254.169.254", family: 4 }] as never);

    const result = await resolveAndValidateSmtpHost("smtp.evil.com");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("blocked address");
  });

  it("detects DNS rebinding to loopback", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "127.0.0.1", family: 4 }] as never);

    const result = await resolveAndValidateSmtpHost("smtp.evil.com");
    expect(result.valid).toBe(false);
  });

  it("allows hostname resolving to public IP", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "52.94.253.1", family: 4 }] as never);

    const result = await resolveAndValidateSmtpHost("email-smtp.us-east-1.amazonaws.com");
    expect(result.valid).toBe(true);
  });

  it("allows through on DNS failure (transient issues)", async () => {
    vi.mocked(dns.lookup).mockRejectedValue(new Error("ENOTFOUND"));

    const result = await resolveAndValidateSmtpHost("smtp.example.com");
    expect(result.valid).toBe(true);
  });

  it("checks all resolved addresses", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([
      { address: "52.94.253.1", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ] as never);

    const result = await resolveAndValidateSmtpHost("smtp.dual.com");
    expect(result.valid).toBe(false);
  });
});
