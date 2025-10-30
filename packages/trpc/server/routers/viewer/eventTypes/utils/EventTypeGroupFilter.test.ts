import { describe, it, expect } from "vitest";

import { MembershipRole } from "@calcom/prisma/enums";

import { filterEvents } from "./EventTypeGroupFilter";
import type { TeamPermissions } from "./permissionUtils";
import type { EventTypeGroup } from "./transformUtils";

describe("EventTypeGroupFilter", () => {
  const mockUserGroup: EventTypeGroup = {
    teamId: null,
    bookerUrl: "https://cal.com/user",
    membershipRole: null,
    profile: {
      slug: "user",
      name: "User",
      image: "avatar.jpg",
    },
    metadata: {
      membershipCount: 1,
      readOnly: false,
    },
  };

  const mockTeamGroup1: EventTypeGroup = {
    teamId: 1,
    bookerUrl: "https://cal.com/team1",
    membershipRole: MembershipRole.ADMIN,
    profile: {
      slug: "team1",
      name: "Team 1",
      image: "team1.jpg",
    },
    metadata: {
      membershipCount: 5,
      readOnly: false,
    },
  };

  const mockTeamGroup2: EventTypeGroup = {
    teamId: 2,
    bookerUrl: "https://cal.com/team2",
    membershipRole: MembershipRole.MEMBER,
    profile: {
      slug: "team2",
      name: "Team 2",
      image: "team2.jpg",
    },
    metadata: {
      membershipCount: 3,
      readOnly: true,
    },
  };

  const mockPermissionsMap = new Map<number, TeamPermissions>([
    [1, { canCreate: true, canEdit: true, canDelete: true, canRead: true }],
    [2, { canCreate: false, canEdit: true, canDelete: false, canRead: true }],
  ]);

  const allGroups = [mockUserGroup, mockTeamGroup1, mockTeamGroup2];

  describe("has() method", () => {
    it("should filter groups with eventType.create permission", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).has("eventType.create").get();

      expect(result).toHaveLength(2);
      expect(result).toContain(mockUserGroup); // User groups always have permissions
      expect(result).toContain(mockTeamGroup1); // Team 1 has create permission
      expect(result).not.toContain(mockTeamGroup2); // Team 2 doesn't have create permission
    });

    it("should filter groups with eventType.read permission", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).has("eventType.read").get();

      expect(result).toHaveLength(3); // All groups can read
      expect(result).toContain(mockUserGroup);
      expect(result).toContain(mockTeamGroup1);
      expect(result).toContain(mockTeamGroup2);
    });

    it("should filter groups with eventType.update permission", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).has("eventType.update").get();

      expect(result).toHaveLength(3); // All groups can edit in this test
      expect(result).toContain(mockUserGroup);
      expect(result).toContain(mockTeamGroup1);
      expect(result).toContain(mockTeamGroup2);
    });

    it("should filter groups with eventType.delete permission", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).has("eventType.delete").get();

      expect(result).toHaveLength(2);
      expect(result).toContain(mockUserGroup);
      expect(result).toContain(mockTeamGroup1);
      expect(result).not.toContain(mockTeamGroup2);
    });

    it("should return empty array for unknown permission", () => {
      const teamOnlyGroups = [mockTeamGroup1, mockTeamGroup2];
      const result = filterEvents(teamOnlyGroups, mockPermissionsMap)
        .has("unknown.permission" as "eventType.read")
        .get();

      expect(result).toHaveLength(0);
    });
  });

  describe("byTeam() method", () => {
    it("should filter groups by team ID", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).byTeam(1).get();

      expect(result).toHaveLength(1);
      expect(result).toContain(mockTeamGroup1);
    });

    it("should return empty array for non-existent team", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).byTeam(999).get();

      expect(result).toHaveLength(0);
    });
  });

  describe("userOnly() method", () => {
    it("should return only user groups", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).userOnly().get();

      expect(result).toHaveLength(1);
      expect(result).toContain(mockUserGroup);
    });
  });

  describe("teamsOnly() method", () => {
    it("should return only team groups", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).teamsOnly().get();

      expect(result).toHaveLength(2);
      expect(result).toContain(mockTeamGroup1);
      expect(result).toContain(mockTeamGroup2);
      expect(result).not.toContain(mockUserGroup);
    });
  });

  describe("readOnly() method", () => {
    it("should filter by read-only status", () => {
      const readOnlyResult = filterEvents(allGroups, mockPermissionsMap).readOnly(true).get();
      const writableResult = filterEvents(allGroups, mockPermissionsMap).readOnly(false).get();

      expect(readOnlyResult).toHaveLength(1);
      expect(readOnlyResult).toContain(mockTeamGroup2);

      expect(writableResult).toHaveLength(2);
      expect(writableResult).toContain(mockUserGroup);
      expect(writableResult).toContain(mockTeamGroup1);
    });
  });

  describe("chaining methods", () => {
    it("should support method chaining", () => {
      const result = filterEvents(allGroups, mockPermissionsMap).teamsOnly().has("eventType.create").get();

      expect(result).toHaveLength(1);
      expect(result).toContain(mockTeamGroup1);
    });

    it("should support complex chaining", () => {
      const result = filterEvents(allGroups, mockPermissionsMap)
        .has("eventType.update")
        .readOnly(false)
        .get();

      expect(result).toHaveLength(2);
      expect(result).toContain(mockUserGroup);
      expect(result).toContain(mockTeamGroup1);
    });
  });

  describe("utility methods", () => {
    it("should return correct count", () => {
      const count = filterEvents(allGroups, mockPermissionsMap).teamsOnly().count();

      expect(count).toBe(2);
    });

    it("should check existence correctly", () => {
      const exists = filterEvents(allGroups, mockPermissionsMap).byTeam(1).exists();
      const notExists = filterEvents(allGroups, mockPermissionsMap).byTeam(999).exists();

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });
});
