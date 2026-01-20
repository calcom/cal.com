import { describe, expect, it } from "vitest";

import { getOrgUsernameFromEmail, deriveNameFromOrgUsername } from "./getOrgUsernameFromEmail";

describe("getOrgUsernameFromEmail", () => {
  it("should generate username with only email user part when domain matches autoAcceptEmailDomain", () => {
    const email = "john.doe@example.com";
    const autoAcceptEmailDomain = "example.com";
    const result = getOrgUsernameFromEmail(email, autoAcceptEmailDomain);
    expect(result).toBe("john.doe");
  });

  it("should generate username with email user and domain when domain doesn't match autoAcceptEmailDomain", () => {
    const email = "john.doe@example.com";
    const autoAcceptEmailDomain = "different.com";
    const result = getOrgUsernameFromEmail(email, autoAcceptEmailDomain);
    expect(result).toBe("john.doe-example");
  });

  it("should generate unique usernames for different emails even with same name", () => {
    const email1 = "alice@acme.com";
    const email2 = "alice+work@corp.com";

    const username1 = getOrgUsernameFromEmail(email1, null);
    const username2 = getOrgUsernameFromEmail(email2, null);

    expect(username1).toBe("alice-acme");
    expect(username2).toBe("alice-work-corp");
    expect(username1).not.toBe(username2);
  });

  it("should handle email with plus sign correctly", () => {
    const email = "bob+test@example.com";
    const result = getOrgUsernameFromEmail(email, "example.com");
    expect(result).toBe("bob-test");
  });

  it("should handle null autoAcceptEmailDomain", () => {
    const email = "user@company.com";
    const result = getOrgUsernameFromEmail(email, null);
    expect(result).toBe("user-company");
  });
});

describe("deriveNameFromOrgUsername", () => {
  it("should convert hyphenated username to capitalized words", () => {
    const username = "john-doe-example";
    const result = deriveNameFromOrgUsername({ username });
    expect(result).toBe("John Doe Example");
  });
});
