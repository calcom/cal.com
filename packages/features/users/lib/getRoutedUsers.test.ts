import { describe, it, expect, vi } from "vitest";

import { getRoutedUsersWithContactOwnerAndFixedUsers } from "./getRoutedUsers";

vi.mock("@calcom/prisma", () => {
  return {
    default: vi.fn(),
  };
});

describe("getRoutedUsersWithContactOwnerAndFixedUsers", () => {
  const users = [
    { id: 1, email: "user1@example.com", isFixed: false },
    { id: 2, email: "user2@example.com", isFixed: true },
    { id: 3, email: "user3@example.com", isFixed: false },
    { id: 4, email: "owner@example.com", isFixed: false },
  ];

  const usersWithoutFixedHosts = users.map((user) => ({ ...user, isFixed: false }));

  it("should return all users when routedTeamMemberIds is null", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: null,
      users,
      contactOwnerEmail: "owner@example.com",
    });
    expect(result).toEqual(users);
  });

  it("should return all users when routedTeamMemberIds is empty - We don't want to enter a scenario where we have no team members to be booked", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [],
      users,
      contactOwnerEmail: "owner@example.com",
    });
    expect(result).toEqual(users);
  });

  it("should filter users based on routedTeamMemberIds and contactOwnerEmail, excluding non-routed fixed hosts", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [1, 3],
      users,
      contactOwnerEmail: "owner@example.com",
    });
    // When routing is applied, fixed hosts NOT in routedTeamMemberIds should be excluded
    expect(result).toEqual([
      { id: 1, email: "user1@example.com", isFixed: false },
      { id: 3, email: "user3@example.com", isFixed: false },
      { id: 4, email: "owner@example.com", isFixed: false },
    ]);
  });

  it("should include fixed hosts when they ARE in routedTeamMemberIds", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [1, 2],
      users,
      contactOwnerEmail: null,
    });
    // Fixed host (id: 2) is included because they're in routedTeamMemberIds
    expect(result).toEqual([
      { id: 1, email: "user1@example.com", isFixed: false },
      { id: 2, email: "user2@example.com", isFixed: true },
    ]);
  });

  it("should return an empty array when routedTeamMemberIds and contactOwnerEmail don't match any user", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [5],
      users: usersWithoutFixedHosts,
      contactOwnerEmail: "nonexistent@example.com",
    });
    expect(result).toEqual([]);
  });

  it("should NOT return fixed hosts when they are not in routedTeamMemberIds", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [5],
      users,
      contactOwnerEmail: "nonexistent@example.com",
    });
    // Fixed hosts should NOT be automatically included when routing is applied
    // and they're not in routedTeamMemberIds
    expect(result).toEqual([]);
  });
});
