import { describe, expect, it } from "vitest";

import { hasEmptyAssignment } from "../../lib/hasEmptyAssignment";

describe("Tests to Check if Event Types have empty Assignment", () => {
  it("should return true if managed event type has no assigned users", () => {
    expect(
      hasEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: false,
        hosts: [{ userId: 101, isFixed: false, priority: 2 }],
        schedulingType: "MANAGED",
      })
    ).toBe(true);
  });
  it("should return true if non-managed event type has no hosts assigned", () => {
    expect(
      hasEmptyAssignment({
        assignedUsers: [
          {
            created: true,
            owner: {
              id: 101,
              avatar: "avatar.svg",
              email: "firstuser@cal.com",
              membership: "OWNER",
              name: "First user",
              username: "firstuser",
              profile: {
                username: "firstuser",
                upId: "usr-101",
                id: null,
                organization: null,
                organizationId: null,
              },
              avatarUrl: null,
              nonProfileUsername: null,
            },
            slug: "managedevent",
            hidden: false,
          },
        ],
        assignAllTeamMembers: false,
        hosts: [],
        schedulingType: "ROUND_ROBIN",
      })
    ).toBe(true);
  });
  it("should return false if assignAllTeamMembers is selected", () => {
    expect(
      hasEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: true,
        hosts: [],
        schedulingType: "ROUND_ROBIN",
      })
    ).toBe(false);
  });
  it("should return false if non-managed event type has hosts assigned", () => {
    expect(
      hasEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: false,
        hosts: [{ userId: 101, isFixed: false, priority: 2 }],
        schedulingType: "ROUND_ROBIN",
      })
    ).toBe(false);
  });
  it("should return false if managed event type has assigned users", () => {
    expect(
      hasEmptyAssignment({
        assignedUsers: [
          {
            created: true,
            owner: {
              id: 101,
              avatar: "avatar.svg",
              email: "firstuser@cal.com",
              membership: "OWNER",
              name: "First user",
              username: "firstuser",
              profile: {
                username: "firstuser",
                upId: "usr-101",
                id: null,
                organization: null,
                organizationId: null,
              },
              avatarUrl: null,
              nonProfileUsername: null,
            },
            slug: "managedevent",
            hidden: false,
          },
        ],
        assignAllTeamMembers: false,
        hosts: [],
        schedulingType: "MANAGED",
      })
    ).toBe(false);
  });
});
