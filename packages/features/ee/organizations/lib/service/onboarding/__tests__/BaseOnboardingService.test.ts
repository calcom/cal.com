import { describe, expect, it, vi } from "vitest";

import type { User } from "@calcom/prisma/client";
import { UserPermissionRole } from "@calcom/prisma/enums";

vi.mock("@calcom/features/ee/teams/repositories/TeamRepository", () => ({
  TeamRepository: class {
    constructor() {}
    findOwnedTeamsByUserId(_: { userId: number }) {
      return Promise.resolve([]);
    }
  },
}));

import { BaseOnboardingService } from "../BaseOnboardingService";
import type { CreateOnboardingIntentInput, OnboardingIntentResult } from "../types";

class TestableBaseOnboardingService extends BaseOnboardingService {
  async createOnboardingIntent(_input: CreateOnboardingIntentInput): Promise<OnboardingIntentResult> {
    throw new Error("Not implemented");
  }

  public async testBuildTeamsAndInvites(
    orgSlug: string,
    teams: CreateOnboardingIntentInput["teams"],
    invitedMembers: CreateOnboardingIntentInput["invitedMembers"]
  ) {
    return this.buildTeamsAndInvites(orgSlug, teams, invitedMembers);
  }
}

const mockUser: Pick<User, "id" | "email" | "role" | "name"> = {
  id: 1,
  email: "user@example.com",
  role: UserPermissionRole.USER,
  name: "Test User",
};

describe("BaseOnboardingService", () => {
  describe("buildTeamsAndInvites", () => {
    it("should filter out invites with empty emails", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const invites = [
        { email: "valid@example.com", teamName: "Marketing", role: "MEMBER" },
        { email: "", teamName: "Sales", role: "ADMIN" },
        { email: "   ", teamName: "Engineering", role: "MEMBER" },
        { email: "another@example.com", teamName: "Design", role: "MEMBER" },
      ];

      const { invitedMembersData } = await service.testBuildTeamsAndInvites("test-org", [], invites);

      expect(invitedMembersData).toHaveLength(2);
      expect(invitedMembersData).toEqual([
        {
          email: "valid@example.com",
          name: undefined,
          teamId: undefined,
          teamName: "Marketing",
          role: "MEMBER",
        },
        {
          email: "another@example.com",
          name: undefined,
          teamId: undefined,
          teamName: "Design",
          role: "MEMBER",
        },
      ]);
    });

    it("should preserve all fields from invites including role", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const invites = [
        {
          email: "member@example.com",
          name: "John Doe",
          teamId: 5,
          teamName: "Marketing",
          role: "MEMBER",
        },
        {
          email: "admin@example.com",
          name: "Jane Smith",
          teamId: 10,
          teamName: "Engineering",
          role: "ADMIN",
        },
      ];

      const { invitedMembersData } = await service.testBuildTeamsAndInvites("test-org", [], invites);

      expect(invitedMembersData).toEqual([
        {
          email: "member@example.com",
          name: "John Doe",
          teamId: 5,
          teamName: "Marketing",
          role: "MEMBER",
        },
        {
          email: "admin@example.com",
          name: "Jane Smith",
          teamId: 10,
          teamName: "Engineering",
          role: "ADMIN",
        },
      ]);
    });

    it("should handle invites without optional fields", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const invites = [
        { email: "minimal@example.com" },
        { email: "withteam@example.com", teamName: "Sales" },
      ];

      const { invitedMembersData } = await service.testBuildTeamsAndInvites("test-org", [], invites);

      expect(invitedMembersData).toEqual([
        {
          email: "minimal@example.com",
          name: undefined,
          teamId: undefined,
          teamName: undefined,
          role: undefined,
        },
        {
          email: "withteam@example.com",
          name: undefined,
          teamId: undefined,
          teamName: "Sales",
          role: undefined,
        },
      ]);
    });

    it("should filter out teams with empty names", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const teams = [
        { id: 1, name: "Marketing", isBeingMigrated: false, slug: null },
        { id: 2, name: "", isBeingMigrated: false, slug: null },
        { id: 3, name: "   ", isBeingMigrated: false, slug: null },
        { id: 4, name: "Engineering", isBeingMigrated: true, slug: "eng" },
      ];

      const { teamsData } = await service.testBuildTeamsAndInvites("test-org", teams, []);

      expect(teamsData).toHaveLength(2);
      expect(teamsData).toEqual([
        { id: 1, name: "Marketing", isBeingMigrated: false, slug: null },
        { id: 4, name: "Engineering", isBeingMigrated: true, slug: "eng" },
      ]);
    });

    it("should preserve team properties including migration status", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const teams = [
        { id: -1, name: "New Team", isBeingMigrated: false, slug: null },
        { id: 42, name: "Existing Team", isBeingMigrated: true, slug: "existing-team" },
      ];

      const { teamsData } = await service.testBuildTeamsAndInvites("test-org", teams, []);

      expect(teamsData).toEqual([
        { id: -1, name: "New Team", isBeingMigrated: false, slug: null },
        { id: 42, name: "Existing Team", isBeingMigrated: true, slug: "existing-team" },
      ]);
    });

    it("should handle empty teams and invites arrays", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const { teamsData, invitedMembersData } = await service.testBuildTeamsAndInvites("test-org", [], []);

      expect(teamsData).toEqual([]);
      expect(invitedMembersData).toEqual([]);
    });

    it("should handle undefined teams and invites", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const { teamsData, invitedMembersData } = await service.testBuildTeamsAndInvites("test-org", undefined, undefined);

      expect(teamsData).toEqual([]);
      expect(invitedMembersData).toEqual([]);
    });

    it("should preserve invites with teamId=-1 for new teams", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const teams = [
        { id: -1, name: "Marketing", isBeingMigrated: false, slug: null },
        { id: -1, name: "Sales", isBeingMigrated: false, slug: null },
      ];

      const invites = [
        { email: "user1@example.com", teamId: -1, teamName: "Marketing", role: "MEMBER" },
        { email: "user2@example.com", teamId: -1, teamName: "Sales", role: "ADMIN" },
      ];

      const { teamsData, invitedMembersData } = await service.testBuildTeamsAndInvites("test-org", teams, invites);

      expect(teamsData).toHaveLength(2);
      expect(invitedMembersData).toHaveLength(2);
      expect(invitedMembersData[0].teamId).toBe(-1);
      expect(invitedMembersData[1].teamId).toBe(-1);
      expect(invitedMembersData[0].role).toBe("MEMBER");
      expect(invitedMembersData[1].role).toBe("ADMIN");
    });

    it("should handle mixed scenarios with both org-level and team-specific invites", async () => {
      const service = new TestableBaseOnboardingService(mockUser);

      const teams = [
        { id: -1, name: "Marketing", isBeingMigrated: false, slug: null },
        { id: 42, name: "Engineering", isBeingMigrated: true, slug: "eng" },
      ];

      const invites = [
        { email: "orguser@example.com", role: "MEMBER" },
        { email: "marketing@example.com", teamName: "Marketing", teamId: -1, role: "MEMBER" },
        { email: "eng@example.com", teamName: "Engineering", teamId: 42, role: "ADMIN" },
      ];

      const { teamsData, invitedMembersData } = await service.testBuildTeamsAndInvites("test-org", teams, invites);

      expect(teamsData).toHaveLength(2);
      expect(invitedMembersData).toHaveLength(3);

      expect(invitedMembersData[0]).toEqual({
        email: "orguser@example.com",
        name: undefined,
        teamId: undefined,
        teamName: undefined,
        role: "MEMBER",
      });

      expect(invitedMembersData[1]).toEqual({
        email: "marketing@example.com",
        name: undefined,
        teamId: -1,
        teamName: "Marketing",
        role: "MEMBER",
      });

      expect(invitedMembersData[2]).toEqual({
        email: "eng@example.com",
        name: undefined,
        teamId: 42,
        teamName: "Engineering",
        role: "ADMIN",
      });
    });
  });
});
