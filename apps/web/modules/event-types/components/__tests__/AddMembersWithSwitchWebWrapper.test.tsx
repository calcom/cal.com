import { describe, expect, it } from "vitest";

import { parseEmails } from "../emailInviteUtils";

describe("AddMembersWithSwitchWebWrapper helpers", () => {
  it("parses and deduplicates emails across delimiters", () => {
    const input = "User@example.com user@example.com;second@example.com, third@example.com second@example.com";
    const result = parseEmails(input);

    expect(result).toEqual([
      "user@example.com",
      "second@example.com",
      "third@example.com",
    ]);
  });
});
