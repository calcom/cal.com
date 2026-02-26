import { describe, expect, it } from "vitest";

import { domainRegex, emailRegex, emailSchema } from "./emailSchema";

describe("emailRegex", () => {
  const validEmails = [
    "user@example.com",
    "user.name@example.com",
    "user+tag@example.com",
    "user@sub.domain.com",
    "USER@EXAMPLE.COM",
    "user123@example.co.uk",
    "user_name@example.org",
    "user-name@example.org",
    "a@b.co",
    "user'name@example.com",
  ];

  const invalidEmails = [
    "plainaddress",
    "@missing-local.com",
    "user@",
    "user@.com",
    ".leading-dot@example.com",
    "user..double-dot@example.com",
    "user@-leading-hyphen.com",
    "user@example",
  ];

  it.each(validEmails)("matches valid email: %s", (email) => {
    expect(emailRegex.test(email)).toBe(true);
  });

  it.each(invalidEmails)("rejects invalid email: %s", (email) => {
    expect(emailRegex.test(email)).toBe(false);
  });
});

describe("domainRegex", () => {
  const validDomains = [
    "example.com",
    "sub.example.com",
    "example.co.uk",
    "münchen.de",
    "a.co",
    "123.com",
    "test-domain.com",
  ];

  const invalidDomains = ["-leading-hyphen.com", "trailing-hyphen-.com", ".leading-dot.com"];

  it.each(validDomains)("matches valid domain: %s", (domain) => {
    expect(domainRegex.test(domain)).toBe(true);
  });

  it.each(invalidDomains)("rejects invalid domain: %s", (domain) => {
    expect(domainRegex.test(domain)).toBe(false);
  });
});

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    const result = emailSchema.safeParse("user@example.com");
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = emailSchema.safeParse("not-an-email");
    expect(result.success).toBe(false);
  });

  it("rejects email exceeding max length (254 chars)", () => {
    // 244 + @ + example.com (11) = 256 > 254
    const longLocal = "a".repeat(244);
    const longEmail = `${longLocal}@example.com`;
    expect(longEmail.length).toBeGreaterThan(254);
    const result = emailSchema.safeParse(longEmail);
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = emailSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("accepts email at maximum valid length", () => {
    // Local part 64 chars + @ + domain that keeps total at 254
    const local = "a".repeat(64);
    const domain = "b".repeat(185) + ".com";
    const email = `${local}@${domain}`;
    // 64 + 1 + 189 = 254
    const result = emailSchema.safeParse(email);
    expect(result.success).toBe(true);
  });
});
