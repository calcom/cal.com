import { describe, expect, it } from "vitest";

import {
  findOptionByEmail,
  getEmailTokens,
  getValidUniqueEmails,
} from "./checkedTeamSelectEmailUtils";

describe("checkedTeamSelectEmailUtils", () => {
  it("parses comma-separated emails", () => {
    expect(getEmailTokens(" user1@example.com, user2@example.com ")).toEqual([
      "user1@example.com",
      "user2@example.com",
    ]);
  });

  it("filters invalid emails and deduplicates", () => {
    expect(getValidUniqueEmails("invalid, user@example.com,USER@example.com, two@example.com")).toEqual([
      "user@example.com",
      "two@example.com",
    ]);
  });

  it("matches existing member options by email", () => {
    const options = [
      {
        value: "1",
        label: "Jane",
        avatar: "",
        groupId: null,
        email: "jane@example.com",
      },
      {
        value: "invite:user@example.com",
        label: "user@example.com (invite)",
        avatar: "",
        groupId: null,
        email: "user@example.com",
        isEmailInvite: true,
      },
    ];

    expect(findOptionByEmail(options, "JANE@example.com")?.value).toBe("1");
    expect(findOptionByEmail(options, "not-found@example.com")).toBeUndefined();
  });
});

