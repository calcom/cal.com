import { describe, expect, it } from "vitest";

import { checkForEmptyAssignment } from "./checkForEmptyAssignment";

describe("Tests to Check if Event Types have empty Assignment", () => {
  it("should return true if managed event type has no assigned users", () => {
    expect(
      checkForEmptyAssignment({
        childrenCount: 0,
        assignAllTeamMembers: false,
        hostCount: 1,
        isManagedEventType: true,
      })
    ).toBe(true);
  });
  it("should return true if non-managed event type has no hosts assigned", () => {
    expect(
      checkForEmptyAssignment({
        childrenCount: 1,
        assignAllTeamMembers: false,
        hostCount: 0,
        isManagedEventType: false,
      })
    ).toBe(true);
  });
  it("should return false if assignAllTeamMembers is selected", () => {
    expect(
      checkForEmptyAssignment({
        childrenCount: 0,
        assignAllTeamMembers: true,
        hostCount: 0,
        isManagedEventType: false,
      })
    ).toBe(false);
  });
  it("should return false if non-managed event type has hosts assigned", () => {
    expect(
      checkForEmptyAssignment({
        childrenCount: 0,
        assignAllTeamMembers: false,
        hostCount: 1,
        isManagedEventType: false,
      })
    ).toBe(false);
  });
  it("should return false if managed event type has assigned users", () => {
    expect(
      checkForEmptyAssignment({
        childrenCount: 1,
        assignAllTeamMembers: false,
        hostCount: 1,
        isManagedEventType: true,
      })
    ).toBe(false);
  });
});
