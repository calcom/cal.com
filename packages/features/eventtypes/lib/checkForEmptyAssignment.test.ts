import { describe, expect, it } from "vitest";

import { checkForEmptyAssignment } from "./checkForEmptyAssignment";

describe("Tests to Check if Event Types have empty Assignment", () => {
  it("should return true if managed event type has no assigned users", () => {
    expect(
      checkForEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: false,
        hosts: [
          {
            userId: 101,
            isFixed: false,
            priority: 2,
            weight: 100,
            scheduleId: null,
            user: { timeZone: "America/New_York" },
          },
        ],
        isManagedEventType: true,
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
        isManagedEventType: false,
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
      })
    ).toBe(false);
  });
  it("should return false if non-managed event type has hosts assigned", () => {
    expect(
      checkForEmptyAssignment({
        assignedUsers: [],
        assignAllTeamMembers: false,
        hosts: [
          {
            userId: 101,
            isFixed: false,
            priority: 2,
            weight: 100,
            scheduleId: null,
            user: { timeZone: "America/New_York" },
          },
        ],
        isManagedEventType: false,
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
        hosts: [
          {
            userId: 101,
            isFixed: false,
            priority: 2,
            weight: 100,
            scheduleId: null,
            user: { timeZone: "America/New_York" },
          },
        ],
        isManagedEventType: true,
      })
    ).toBe(false);
  });
});
