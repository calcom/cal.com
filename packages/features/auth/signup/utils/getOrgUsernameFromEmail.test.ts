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
});

describe("deriveNameFromOrgUsername", () => {
  it("should convert hyphenated username to capitalized words", () => {
    const username = "john-doe-example";
    const result = deriveNameFromOrgUsername({ username });
    expect(result).toBe("John Doe Example");
  });
});
