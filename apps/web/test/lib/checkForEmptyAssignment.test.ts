import { describe, expect, it } from "vitest";

import { checkForEmptyAssignment } from "../../lib/checkForEmptyAssignment";

describe("Check Empty Assignment Tests", () => {
  it("should return true if managed event type has no assigned users", () => {
    expect(
      checkForEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: false,
        hosts: [{ userId: 101, isFixed: false, priority: 2 }],
        isManagedEventType: true,
        isTeamEvent: true,
      })
    ).toBe(true);
  });
  it("should return true if non-managed event type has no hosts assigned", () => {
    expect(
      checkForEmptyAssignment({
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
              eventTypeSlugs: ["15min"],
              profile: {
                username: "firstuser",
                upId: "usr-101",
                id: null,
                organization: null,
                organizationId: null,
              },
            },
            slug: "managedevent",
            value: "101",
            label: "",
            hidden: false,
          },
        ],
        assignAllTeamMembers: false,
        hosts: [],
        isManagedEventType: false,
        isTeamEvent: true,
      })
    ).toBe(true);
  });
  it("should return false if assignAllTeamMembers is selected", () => {
    expect(
      checkForEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: true,
        hosts: [],
        isManagedEventType: false,
        isTeamEvent: true,
      })
    ).toBe(false);
  });
  it("should return false if non-managed event type has hosts assigned", () => {
    expect(
      checkForEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: false,
        hosts: [{ userId: 101, isFixed: false, priority: 2 }],
        isManagedEventType: false,
        isTeamEvent: true,
      })
    ).toBe(false);
  });
  it("should return false if managed event type has assigned users", () => {
    expect(
      checkForEmptyAssignment({
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
              eventTypeSlugs: ["15min"],
              profile: {
                username: "firstuser",
                upId: "usr-101",
                id: null,
                organization: null,
                organizationId: null,
              },
            },
            slug: "managedevent",
            value: "101",
            label: "",
            hidden: false,
          },
        ],
        assignAllTeamMembers: false,
        hosts: [],
        isManagedEventType: true,
        isTeamEvent: true,
      })
    ).toBe(false);
  });
});
