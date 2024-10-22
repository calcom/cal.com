import { describe, it, expect } from "vitest";

import {
  getRoutedHostsWithContactOwnerAndFixedHosts,
  getRoutedUsersWithContactOwnerAndFixedUsers,
} from "./getRoutedUsers";

describe("getRoutedHostsWithContactOwnerAndFixedHosts", () => {
  const hosts = [
    { user: { id: 1, email: "user1@example.com" }, isFixed: false },
    { user: { id: 2, email: "user2@example.com" }, isFixed: true },
    { user: { id: 3, email: "user3@example.com" }, isFixed: false },
    { user: { id: 4, email: "owner@example.com" }, isFixed: false },
  ];

  const hostsWithoutFixedHosts = hosts.map((host) => ({ ...host, isFixed: false }));

  it("should return all hosts when routedTeamMemberIds is null", () => {
    const result = getRoutedHostsWithContactOwnerAndFixedHosts({
      routedTeamMemberIds: null,
      hosts,
      contactOwnerEmail: "owner@example.com",
    });
    expect(result).toEqual(hosts);
  });

  it("should return all hosts when routedTeamMemberIds is empty - We don't want to enter a scenario where we have no team members to be booked", () => {
    const result = getRoutedHostsWithContactOwnerAndFixedHosts({
      routedTeamMemberIds: [],
      hosts,
      contactOwnerEmail: "owner@example.com",
    });
    expect(result).toEqual(hosts);
  });

  it("should filter hosts based on routedTeamMemberIds, isFixed, and contactOwnerEmail", () => {
    const result = getRoutedHostsWithContactOwnerAndFixedHosts({
      routedTeamMemberIds: [1, 3],
      hosts,
      contactOwnerEmail: "owner@example.com",
    });
    expect(result).toEqual([
      { user: { id: 1, email: "user1@example.com" }, isFixed: false },
      { user: { id: 2, email: "user2@example.com" }, isFixed: true },
      { user: { id: 3, email: "user3@example.com" }, isFixed: false },
      { user: { id: 4, email: "owner@example.com" }, isFixed: false },
    ]);
  });

  it("should return an empty array when no hosts match the criteria", () => {
    const result = getRoutedHostsWithContactOwnerAndFixedHosts({
      routedTeamMemberIds: [5],
      hosts: hostsWithoutFixedHosts,
      contactOwnerEmail: "nonexistent@example.com",
    });
    expect(result).toEqual([]);
  });

  it("should return fixed hosts even if routedTeamMemberIds and contactOwnerEmail are invalid   ", () => {
    const result = getRoutedHostsWithContactOwnerAndFixedHosts({
      routedTeamMemberIds: [5],
      hosts,
      contactOwnerEmail: "nonexistent@example.com",
    });
    expect(result).toEqual([{ user: { id: 2, email: "user2@example.com" }, isFixed: true }]);
  });
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

  it("should filter users based on routedTeamMemberIds, isFixed, and contactOwnerEmail", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [1, 3],
      users,
      contactOwnerEmail: "owner@example.com",
    });
    expect(result).toEqual([
      { id: 1, email: "user1@example.com", isFixed: false },
      { id: 2, email: "user2@example.com", isFixed: true },
      { id: 3, email: "user3@example.com", isFixed: false },
      { id: 4, email: "owner@example.com", isFixed: false },
    ]);
  });

  it("should return an empty array when neither fixed, nor routedTeamMemberIds, nor contactOwnerEmail match", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [5],
      users: usersWithoutFixedHosts,
      contactOwnerEmail: "nonexistent@example.com",
    });
    expect(result).toEqual([]);
  });

  it("should return fixed hosts even if routedTeamMemberIds and contactOwnerEmail are invalid   ", () => {
    const result = getRoutedUsersWithContactOwnerAndFixedUsers({
      routedTeamMemberIds: [5],
      users,
      contactOwnerEmail: "nonexistent@example.com",
    });
    expect(result).toEqual([{ id: 2, email: "user2@example.com", isFixed: true }]);
  });
});
