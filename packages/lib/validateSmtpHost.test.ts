import { describe, it, expect } from "vitest";

import { validateSmtpHost } from "./validateSmtpHost";

describe("validateSmtpHost", () => {
  describe("blocks dangerous addresses", () => {
    it.each([
      ["127.0.0.1", "IPv4 loopback"],
      ["127.0.0.2", "IPv4 loopback alternate"],
      ["169.254.169.254", "cloud metadata endpoint"],
      ["169.254.0.1", "link-local"],
      ["0.0.0.0", "this-network"],
      ["0.1.2.3", "this-network alternate"],
      ["::1", "IPv6 loopback"],
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

  describe("allows legitimate SMTP hosts", () => {
    it.each([
      ["email-smtp.us-east-1.amazonaws.com", "AWS SES"],
      ["smtp.gmail.com", "Gmail"],
      ["smtp.office365.com", "Office 365"],
      ["smtp.sendgrid.net", "SendGrid"],
      ["mail.example.com", "custom domain"],
      ["203.0.113.1", "public IP"],
      ["10.0.0.1", "RFC-1918 internal relay"],
      ["192.168.1.100", "RFC-1918 home network"],
      ["172.16.0.5", "RFC-1918 Class B"],
    ])("allows %s (%s)", (host) => {
      expect(validateSmtpHost(host)).toBe(true);
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
