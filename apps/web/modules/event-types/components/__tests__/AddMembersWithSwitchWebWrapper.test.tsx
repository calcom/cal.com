import { describe, expect, it } from "vitest";

import { normalizeAndValidateEmails, parseEmails } from "../emailInviteUtils";

describe("emailInviteUtils", () => {
  it("parses and deduplicates emails across delimiters", () => {
    const input = "User@example.com user@example.com;second@example.com, third@example.com second@example.com";
    const result = parseEmails(input);

    expect(result).toEqual([
      "user@example.com",
      "second@example.com",
      "third@example.com",
    ]);
  });

  it("returns all valid emails when input is valid", () => {
    const { validEmails, invalidEmails } = normalizeAndValidateEmails("one@example.com two@example.com");
    expect(validEmails).toEqual(["one@example.com", "two@example.com"]);
    expect(invalidEmails).toEqual([]);
  });

  it("flags invalid emails", () => {
    const { validEmails, invalidEmails } = normalizeAndValidateEmails("invalid-email another@com");
    expect(validEmails).toEqual([]);
    expect(invalidEmails).toEqual(["invalid-email", "another@com"]);
  });

  it("handles mixed valid and invalid emails", () => {
    const { validEmails, invalidEmails } = normalizeAndValidateEmails("good@example.com bad@com");
    expect(validEmails).toEqual(["good@example.com"]);
    expect(invalidEmails).toEqual(["bad@com"]);
  });

  it("returns empty arrays for blank input", () => {
    const { validEmails, invalidEmails } = normalizeAndValidateEmails("   ");
    expect(validEmails).toEqual([]);
    expect(invalidEmails).toEqual([]);
  });
});
