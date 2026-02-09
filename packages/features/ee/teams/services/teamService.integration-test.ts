import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import prisma from "@calcom/prisma";
import type { Team, User } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

import { TeamService } from "./teamService";

// Mock the DI container
vi.mock("@calcom/ee/billing/di/containers/Billing", () => {
  const mockUpdateQuantity = vi.fn().mockResolvedValue(undefined);
  const mockTeamBillingService = {
    updateQuantity: mockUpdateQuantity,
  };

  const mockFactory = {
    findAndInitMany: vi.fn().mockResolvedValue([mockTeamBillingService]),
  };

  return {
    getTeamBillingServiceFactory: vi.fn(() => mockFactory),
  };
});

const createTestUser = async (overrides?: {
  email?: string;
  username?: string | null;
  organizationId?: number | null;
}) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);

  return prisma.user.create({
    data: {
      email: overrides?.email ?? `test-user-${timestamp}-${randomSuffix}@example.com`,
      username:
        overrides?.username === null ? null : overrides?.username ?? `testuser-${timestamp}-${randomSuffix}`,
      name: "Test User",
      organizationId: overrides?.organizationId ?? undefined,
    },
  });
};

const createTestTeam = async (overrides?: {
  name?: string;
  slug?: string;
  isOrganization?: boolean;
  parentId?: number | null;
}) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);

  return prisma.team.create({
    data: {
      name: overrides?.name ?? `Test Team ${timestamp}-${randomSuffix}`,
      slug: overrides?.slug ?? `test-team-${timestamp}-${randomSuffix}`,
      isOrganization: overrides?.isOrganization ?? false,
      parentId: overrides?.parentId ?? undefined,
    },
  });
};

const createTestMembership = async (
  userId: number,
  teamId: number,
  overrides?: {
    role?: MembershipRole;
    accepted?: boolean;
  }
) => {
  return prisma.membership.create({
    data: {
      userId,
      teamId,
      role: overrides?.role ?? MembershipRole.MEMBER,
      accepted: overrides?.accepted ?? true,
    },
  });
};

const createTestEventType = async (
  teamId: number,
  overrides?: {
    title?: string;
    slug?: string;
    length?: number;
    parentId?: number;
    userId?: number;
  }
) => {
  const timestamp = Date.now();

  return prisma.eventType.create({
    data: {
      title: overrides?.title ?? `Test Event ${timestamp}`,
      slug: overrides?.slug ?? `test-event-${timestamp}`,
      teamId,
      length: overrides?.length ?? 30,
      parentId: overrides?.parentId,
      userId: overrides?.userId,
    },
  });
};

const createTestHost = async (
  userId: number,
  eventTypeId: number,
  overrides?: {
    isFixed?: boolean;
  }
) => {
  return prisma.host.create({
    data: {
      userId,
      eventTypeId,
      isFixed: overrides?.isFixed ?? false,
    },
  });
};

const expectMembershipExists = async (userId: number, teamId: number) => {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
  });
  expect(membership).not.toBeNull();
};

const expectMembershipNotExists = async (userId: number, teamId: number) => {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
  });
  expect(membership).toBeNull();
};

const expectMembershipCount = async (teamId: number, expectedCount: number) => {
  const count = await prisma.membership.count({
    where: { teamId },
  });
  expect(count).toBe(expectedCount);
};

const expectUserOrganization = async (userId: number, expectedOrgId: number | null) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  expect(user?.organizationId).toBe(expectedOrgId);
};

const expectUserUsername = async (userId: number, expectedUsername: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  expect(user?.username).toBe(expectedUsername);
};

const cleanupTestData = async (teamIds: number[], userIds: number[]) => {
  await prisma.host.deleteMany({
    where: {
      eventType: {
        teamId: { in: teamIds },
      },
    },
  });

  await prisma.eventType.deleteMany({
    where: {
      teamId: { in: teamIds },
    },
  });

  await prisma.membership.deleteMany({
    where: {
      OR: teamIds.map((teamId) => ({ teamId })),
    },
  });

  await prisma.user.deleteMany({
    where: {
      id: { in: userIds },
    },
  });

  await prisma.team.deleteMany({
    where: {
      id: { in: teamIds },
    },
  });
};

describe("TeamService.removeMembers Integration Tests", () => {
  let orgTestData: {
    team: Team;
    teams: Array<{
      team: Team;
      members: User[];
    }>;
    members: User[];
  };
  let regularTeamTestData: {
    team: Team;
    members: User[];
  };
  let userWithoutOrg: User;

  beforeEach(async () => {
    // Create organization structure
    const orgTeam = await createTestTeam({ isOrganization: true });
    const subTeam = await createTestTeam({ parentId: orgTeam.id });

    // Create users
    const orgUser1 = await createTestUser({ organizationId: orgTeam.id });
    const orgUser2 = await createTestUser({ organizationId: orgTeam.id });
    const nonOrgUser = await createTestUser();

    // Create regular team
    const regularTeamEntity = await createTestTeam();

    // Set up memberships
    await createTestMembership(orgUser1.id, orgTeam.id);
    await createTestMembership(orgUser2.id, orgTeam.id);
    await createTestMembership(orgUser1.id, regularTeamEntity.id);
    await createTestMembership(orgUser2.id, regularTeamEntity.id);
    await createTestMembership(orgUser1.id, subTeam.id);
    await createTestMembership(orgUser2.id, subTeam.id);
    await createTestMembership(nonOrgUser.id, regularTeamEntity.id);
    await createTestMembership(nonOrgUser.id, subTeam.id);

    // Structure the test data
    orgTestData = {
      team: orgTeam,
      teams: [
        {
          team: subTeam,
          members: [orgUser1, orgUser2],
        },
      ],
      members: [orgUser1, orgUser2],
    };

    regularTeamTestData = {
      team: regularTeamEntity,
      members: [orgUser1, orgUser2, nonOrgUser],
    };

    userWithoutOrg = nonOrgUser;
  });

  afterEach(async () => {
    const teamIds = [
      orgTestData.team.id,
      ...orgTestData.teams.map((t) => t.team.id),
      regularTeamTestData.team.id,
    ];
    const userIds = [...orgTestData.members.map((u) => u.id), userWithoutOrg.id];

    await cleanupTestData(teamIds, userIds);
    vi.clearAllMocks();
  });

  describe("Team Removal - Sub-Team/Regular Team", () => {
    it("should remove members from a single team", async () => {
      const [orgUser1, orgUser2] = orgTestData.members;

      await TeamService.removeMembers({
        teamIds: [regularTeamTestData.team.id],
        userIds: [orgUser1.id, orgUser2.id],
      });

      await expectMembershipNotExists(orgUser1.id, regularTeamTestData.team.id);
      await expectMembershipNotExists(orgUser2.id, regularTeamTestData.team.id);
      await expectMembershipExists(userWithoutOrg.id, regularTeamTestData.team.id);

      await expectMembershipCount(regularTeamTestData.team.id, 1);

      await expectMembershipExists(orgUser1.id, orgTestData.team.id);
      await expectMembershipExists(orgUser2.id, orgTestData.team.id);
    });

    it("should remove members from multiple teams", async () => {
      const [orgUser1] = orgTestData.members;
      const subTeam = orgTestData.teams[0].team;

      await TeamService.removeMembers({
        teamIds: [regularTeamTestData.team.id, subTeam.id],
        userIds: [orgUser1.id],
      });

      await expectMembershipNotExists(orgUser1.id, regularTeamTestData.team.id);
      await expectMembershipNotExists(orgUser1.id, subTeam.id);

      await expectMembershipExists(orgTestData.members[1].id, regularTeamTestData.team.id);
      await expectMembershipExists(userWithoutOrg.id, regularTeamTestData.team.id);
      await expectMembershipCount(regularTeamTestData.team.id, 2);
    });

    it("should remove hosts from team events when removing team member", async () => {
      // Create a team member
      const teamMember = await createTestUser();
      await createTestMembership(teamMember.id, regularTeamTestData.team.id);

      // Create multiple event types for the team
      const teamEvent1 = await createTestEventType(regularTeamTestData.team.id, {
        title: "Team Event 1",
        slug: "team-event-1",
      });

      const teamEvent2 = await createTestEventType(regularTeamTestData.team.id, {
        title: "Team Event 2",
        slug: "team-event-2",
      });

      // Create an event type for another team (should not be affected)
      const otherTeam = await createTestTeam({ name: "Other Team" });
      const otherTeamEvent = await createTestEventType(otherTeam.id, {
        title: "Other Team Event",
        slug: "other-team-event",
      });

      // Add the user as host to all events
      await createTestHost(teamMember.id, teamEvent1.id);
      await createTestHost(teamMember.id, teamEvent2.id);
      await createTestHost(teamMember.id, otherTeamEvent.id);

      // Also add another user as host to teamEvent1 (should not be affected)
      const anotherUser = await createTestUser();
      await createTestMembership(anotherUser.id, regularTeamTestData.team.id);
      await createTestHost(anotherUser.id, teamEvent1.id);

      // Verify hosts exist before removal
      const hostsBefore = await prisma.host.findMany({
        where: { userId: teamMember.id },
      });
      expect(hostsBefore).toHaveLength(3);

      // Remove member from team (not org)
      await TeamService.removeMembers({
        teamIds: [regularTeamTestData.team.id],
        userIds: [teamMember.id],
        isOrg: false,
      });

      // Verify hosts for team events were removed
      const hostsAfterForTeamEvents = await prisma.host.findMany({
        where: {
          userId: teamMember.id,
          eventTypeId: { in: [teamEvent1.id, teamEvent2.id] },
        },
      });
      expect(hostsAfterForTeamEvents).toHaveLength(0);

      // Verify host for other team event still exists
      const hostsAfterForOtherTeam = await prisma.host.findMany({
        where: {
          userId: teamMember.id,
          eventTypeId: otherTeamEvent.id,
        },
      });
      expect(hostsAfterForOtherTeam).toHaveLength(1);

      // Verify other user's host assignment was not affected
      const otherUserHosts = await prisma.host.findMany({
        where: { userId: anotherUser.id },
      });
      expect(otherUserHosts).toHaveLength(1);
      expect(otherUserHosts[0].eventTypeId).toBe(teamEvent1.id);

      // Verify membership was deleted
      await expectMembershipNotExists(teamMember.id, regularTeamTestData.team.id);

      // Clean up
      await prisma.eventType.deleteMany({
        where: { id: { in: [teamEvent1.id, teamEvent2.id, otherTeamEvent.id] } },
      });
      await cleanupTestData([otherTeam.id], [teamMember.id, anotherUser.id]);
    });

    it("should delete managed event types when removing from team", async () => {
      // Create parent event types
      const parentEventType1 = await createTestEventType(regularTeamTestData.team.id, {
        title: "Parent Team Event 1",
        slug: "parent-team-event-1",
      });

      const parentEventType2 = await createTestEventType(regularTeamTestData.team.id, {
        title: "Parent Team Event 2",
        slug: "parent-team-event-2",
      });

      // Create managed event types for the user (one per parent)
      const managedEventType1 = await createTestEventType(regularTeamTestData.team.id, {
        userId: orgTestData.members[0].id,
        parentId: parentEventType1.id,
        title: "Managed Event 1",
        slug: "managed-event-1",
      });

      const managedEventType2 = await createTestEventType(regularTeamTestData.team.id, {
        userId: orgTestData.members[0].id,
        parentId: parentEventType2.id,
        title: "Managed Event 2",
        slug: "managed-event-2",
      });

      // Create a managed event type for another user (should not be affected)
      const otherUserManagedEvent = await createTestEventType(regularTeamTestData.team.id, {
        userId: orgTestData.members[1].id,
        parentId: parentEventType1.id,
        title: "Other User Managed Event",
        slug: "other-user-managed-event",
      });

      // Remove orgTestData.members[0] from team
      await TeamService.removeMembers({
        teamIds: [regularTeamTestData.team.id],
        userIds: [orgTestData.members[0].id],
        isOrg: false,
      });

      // Verify orgTestData.members[0]'s managed event types were deleted
      const deletedEventType1 = await prisma.eventType.findUnique({
        where: { id: managedEventType1.id },
      });
      expect(deletedEventType1).toBeNull();

      const deletedEventType2 = await prisma.eventType.findUnique({
        where: { id: managedEventType2.id },
      });
      expect(deletedEventType2).toBeNull();

      // Verify parent event types still exist
      const parentStillExists1 = await prisma.eventType.findUnique({
        where: { id: parentEventType1.id },
      });
      expect(parentStillExists1).not.toBeNull();

      const parentStillExists2 = await prisma.eventType.findUnique({
        where: { id: parentEventType2.id },
      });
      expect(parentStillExists2).not.toBeNull();

      // Verify other user's managed event still exists
      const otherUserEventStillExists = await prisma.eventType.findUnique({
        where: { id: otherUserManagedEvent.id },
      });
      expect(otherUserEventStillExists).not.toBeNull();

      // Clean up
      await prisma.eventType.deleteMany({
        where: { id: { in: [parentEventType1.id, parentEventType2.id, otherUserManagedEvent.id] } },
      });
    });

    it("should not modify user organization data when removing from sub-team", async () => {
      await TeamService.removeMembers({
        teamIds: [regularTeamTestData.team.id],
        userIds: [orgTestData.members[0].id],
        isOrg: false,
      });

      await expectMembershipNotExists(orgTestData.members[0].id, regularTeamTestData.team.id);

      const user = await prisma.user.findUnique({
        where: { id: orgTestData.members[0].id },
      });
      // When isOrg is false for regular teams, it should not update organizationId or modify username
      expect(user?.organizationId).toBe(orgTestData.team.id);
      expect(user?.username).toBe(orgTestData.members[0].username);
    });
  });

  describe("Organization Removal", () => {
    it("should remove members from organization and all sub-teams", async () => {
      const originalUsername = orgTestData.members[0].username || "";

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [orgTestData.members[0].id],
        isOrg: true,
      });

      await expectMembershipNotExists(orgTestData.members[0].id, orgTestData.team.id);
      await expectMembershipExists(orgTestData.members[0].id, regularTeamTestData.team.id);
      await expectMembershipNotExists(orgTestData.members[0].id, orgTestData.teams[0].team.id);

      await expectUserOrganization(orgTestData.members[0].id, null);
      await expectUserUsername(orgTestData.members[0].id, `${originalUsername}-${orgTestData.members[0].id}`);
    });

    it("should remove multiple members from organization", async () => {
      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [orgTestData.members[0].id, orgTestData.members[1].id],
        isOrg: true,
      });

      await expectMembershipNotExists(orgTestData.members[0].id, orgTestData.team.id);
      await expectMembershipNotExists(orgTestData.members[1].id, orgTestData.team.id);
      await expectMembershipNotExists(orgTestData.members[0].id, orgTestData.teams[0].team.id);
      await expectMembershipNotExists(orgTestData.members[1].id, orgTestData.teams[0].team.id);

      await expectMembershipExists(userWithoutOrg.id, orgTestData.teams[0].team.id);
    });

    it("should delete host assignments when removing from organization", async () => {
      const eventType = await createTestEventType(orgTestData.teams[0].team.id);
      await createTestHost(orgTestData.members[0].id, eventType.id);

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [orgTestData.members[0].id],
        isOrg: true,
      });

      const hosts = await prisma.host.findMany({
        where: {
          userId: orgTestData.members[0].id,
          eventTypeId: eventType.id,
        },
      });
      expect(hosts).toHaveLength(0);

      await prisma.eventType.delete({
        where: { id: eventType.id },
      });
    });

    it("should prevent username conflicts when removing from organization", async () => {
      const sharedUsername = `sharedusername-${Date.now()}`;

      const userInOrg = await createTestUser({
        username: sharedUsername,
        organizationId: orgTestData.team.id,
      });
      await createTestMembership(userInOrg.id, orgTestData.team.id);

      const userOutsideOrg = await createTestUser({
        username: sharedUsername,
        organizationId: null,
      });

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [userInOrg.id],
        isOrg: true,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userInOrg.id },
      });
      expect(updatedUser?.username).toBe(`${sharedUsername}-${userInOrg.id}`);
      expect(updatedUser?.organizationId).toBeNull();

      const unchangedUser = await prisma.user.findUnique({
        where: { id: userOutsideOrg.id },
      });
      expect(unchangedUser?.username).toBe(sharedUsername);

      await cleanupTestData([], [userInOrg.id, userOutsideOrg.id]);
    });

    it("should preserve null username when removing from organization", async () => {
      const userWithNullUsername = await createTestUser({
        username: null,
        organizationId: orgTestData.team.id,
      });
      await createTestMembership(userWithNullUsername.id, orgTestData.team.id);

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [userWithNullUsername.id],
        isOrg: true,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userWithNullUsername.id },
      });
      expect(updatedUser?.username).toBeNull();
      expect(updatedUser?.organizationId).toBeNull();

      await cleanupTestData([], [userWithNullUsername.id]);
    });

    it("should delete profile when removing from organization", async () => {
      const profileUser = await createTestUser({ organizationId: orgTestData.team.id });
      await createTestMembership(profileUser.id, orgTestData.team.id);

      const profile = await prisma.profile.create({
        data: {
          uid: `profile-${Date.now()}`,
          userId: profileUser.id,
          organizationId: orgTestData.team.id,
          username: profileUser.username || "",
        },
      });

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [profileUser.id],
        isOrg: true,
      });

      const deletedProfile = await prisma.profile.findUnique({
        where: { id: profile.id },
      });
      expect(deletedProfile).toBeNull();

      await cleanupTestData([], [profileUser.id]);
    });

    it("should successfully remove member without profile from organization", async () => {
      const userWithoutProfile = await createTestUser({ organizationId: orgTestData.team.id });
      await createTestMembership(userWithoutProfile.id, orgTestData.team.id);

      await expect(
        TeamService.removeMembers({
          teamIds: [orgTestData.team.id],
          userIds: [userWithoutProfile.id],
          isOrg: true,
        })
      ).resolves.not.toThrow();

      await expectMembershipNotExists(userWithoutProfile.id, orgTestData.team.id);
      await cleanupTestData([], [userWithoutProfile.id]);
    });

    it("should clean up tempOrgRedirect when user movedToProfileId matches", async () => {
      const userWithProfile = await createTestUser({ organizationId: orgTestData.team.id });
      await createTestMembership(userWithProfile.id, orgTestData.team.id);

      const profile = await prisma.profile.create({
        data: {
          uid: `profile-temp-${Date.now()}`,
          userId: userWithProfile.id,
          organizationId: orgTestData.team.id,
          username: userWithProfile.username || "",
        },
      });

      await prisma.user.update({
        where: { id: userWithProfile.id },
        data: { movedToProfileId: profile.id },
      });

      await prisma.tempOrgRedirect.create({
        data: {
          type: "User",
          enabled: true,
          from: userWithProfile.username || "",
          fromOrgId: orgTestData.team.id,
          toUrl: "https://example.com",
        },
      });

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [userWithProfile.id],
        isOrg: true,
      });

      const redirects = await prisma.tempOrgRedirect.findMany({
        where: { from: userWithProfile.username || "" },
      });
      expect(redirects).toHaveLength(0);

      await cleanupTestData([], [userWithProfile.id]);
    });

    it("should append userId to username when removing from organization", async () => {
      const userWithUsername = await prisma.user.create({
        data: {
          email: `member8-acme-${Date.now()}@example.com`,
          username: "member8-acme",
          organizationId: orgTestData.team.id,
        },
      });
      await createTestMembership(userWithUsername.id, orgTestData.team.id);

      // Create a profile to match real-world scenario
      const profile = await prisma.profile.create({
        data: {
          uid: `profile-${Date.now()}`,
          userId: userWithUsername.id,
          organizationId: orgTestData.team.id,
          username: "member8-acme", // Profile has same username
        },
      });

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [userWithUsername.id],
        isOrg: true,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userWithUsername.id },
      });

      // Should append userId to existing username
      expect(updatedUser?.username).toBe(`member8-acme-${userWithUsername.id}`);
      expect(updatedUser?.organizationId).toBeNull();

      // Profile should be deleted
      const deletedProfile = await prisma.profile.findUnique({
        where: { id: profile.id },
      });
      expect(deletedProfile).toBeNull();

      await cleanupTestData([], [userWithUsername.id]);
    });

    it("should preserve null username even when profile has username", async () => {
      const userWithNullUsername = await prisma.user.create({
        data: {
          email: `null-username-user-${Date.now()}@example.com`,
          username: null, // User has null username
          organizationId: orgTestData.team.id,
        },
      });
      await createTestMembership(userWithNullUsername.id, orgTestData.team.id);

      // Create a profile with username
      const profile = await prisma.profile.create({
        data: {
          uid: `profile-null-user-${Date.now()}`,
          userId: userWithNullUsername.id,
          organizationId: orgTestData.team.id,
          username: "member8-acme", // Profile has username
        },
      });

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [userWithNullUsername.id],
        isOrg: true,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userWithNullUsername.id },
      });

      // User username remains null because foundUser.username was null
      expect(updatedUser?.username).toBeNull();
      expect(updatedUser?.organizationId).toBeNull();

      // Profile should be deleted
      const deletedProfile = await prisma.profile.findUnique({
        where: { id: profile.id },
      });
      expect(deletedProfile).toBeNull();

      await cleanupTestData([], [userWithNullUsername.id]);
    });

    it("should append userId to empty username when removing from organization", async () => {
      const userWithEmptyUsername = await prisma.user.create({
        data: {
          email: `empty-username-${Date.now()}@example.com`,
          username: "", // Empty string, not null
          organizationId: orgTestData.team.id,
        },
      });
      await createTestMembership(userWithEmptyUsername.id, orgTestData.team.id);

      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [userWithEmptyUsername.id],
        isOrg: true,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: userWithEmptyUsername.id },
      });

      // Fixed: Empty string usernames should be appended with userId
      expect(updatedUser?.username).toBe(`-${userWithEmptyUsername.id}`);
      expect(updatedUser?.organizationId).toBeNull();

      await cleanupTestData([], [userWithEmptyUsername.id]);
    });

    it("should correctly remove user from organization with sub-team hosts and profile", async () => {
      // This test simulates exactly what happens in API v2 deletion
      const apiUser = await prisma.user.create({
        data: {
          email: `api-test-${Date.now()}@example.com`,
          username: "member8-acme", // Using the exact username from the issue
          organizationId: orgTestData.team.id,
        },
      });

      // Create membership in org
      await createTestMembership(apiUser.id, orgTestData.team.id);

      // Create a sub-team (like in API v2 test)
      const apiSubTeam = await createTestTeam({
        parentId: orgTestData.team.id,
        name: "API Sub Team",
      });

      // Create membership in sub-team
      await createTestMembership(apiUser.id, apiSubTeam.id);

      // Create event type in sub-team
      const apiEventType = await createTestEventType(apiSubTeam.id, {
        title: "API Team Event",
      });

      // Add user as host (like in API v2 test)
      await createTestHost(apiUser.id, apiEventType.id);

      // Create profile (which exists in real scenario)
      const profile = await prisma.profile.create({
        data: {
          uid: `profile-api-${Date.now()}`,
          userId: apiUser.id,
          organizationId: orgTestData.team.id,
          username: "member8-acme",
        },
      });

      // Now remove from organization (what API v2 does)
      await TeamService.removeMembers({ teamIds: [orgTestData.team.id], userIds: [apiUser.id], isOrg: true });

      // Check final state
      const finalUser = await prisma.user.findUnique({
        where: { id: apiUser.id },
        select: { id: true, username: true, organizationId: true },
      });

      // Username should be appended with userId, not null
      expect(finalUser?.username).toBe(`member8-acme-${apiUser.id}`);
      expect(finalUser?.organizationId).toBeNull();

      // Verify profile was deleted
      const deletedProfile = await prisma.profile.findUnique({
        where: { id: profile.id },
      });
      expect(deletedProfile).toBeNull();

      // Verify host was removed
      const hosts = await prisma.host.findMany({
        where: { userId: apiUser.id },
      });
      expect(hosts).toHaveLength(0);

      await cleanupTestData([apiSubTeam.id], [apiUser.id]);
    });

    it("should delete managed event types in sub-teams when removing from organization", async () => {
      // Create another sub-team under the org
      const secondSubTeam = await createTestTeam({
        parentId: orgTestData.team.id,
        name: "Second Sub Team",
      });

      // Add user to the second sub-team
      await createTestMembership(orgTestData.members[0].id, secondSubTeam.id);

      // Create parent event types in both sub-teams
      const parentEventInTeam1 = await createTestEventType(orgTestData.teams[0].team.id, {
        title: "Parent Event Team 1",
        slug: "parent-event-team-1",
      });

      const parentEventInTeam2 = await createTestEventType(secondSubTeam.id, {
        title: "Parent Event Team 2",
        slug: "parent-event-team-2",
      });

      // Create managed events for orgTestData.members[0] in both sub-teams
      const managedEventTeam1 = await createTestEventType(orgTestData.teams[0].team.id, {
        userId: orgTestData.members[0].id,
        parentId: parentEventInTeam1.id,
        title: "User1 Managed Event Team 1",
        slug: "user1-managed-event-team-1",
      });

      const managedEventTeam2 = await createTestEventType(secondSubTeam.id, {
        userId: orgTestData.members[0].id,
        parentId: parentEventInTeam2.id,
        title: "User1 Managed Event Team 2",
        slug: "user1-managed-event-team-2",
      });

      // Create managed event for orgTestData.members[1] (should not be affected)
      const managedEventUser2 = await createTestEventType(orgTestData.teams[0].team.id, {
        userId: orgTestData.members[1].id,
        parentId: parentEventInTeam1.id,
        title: "User2 Managed Event",
        slug: "user2-managed-event",
      });

      // Verify managed events exist before removal
      const eventsBeforeRemoval = await prisma.eventType.findMany({
        where: {
          id: { in: [managedEventTeam1.id, managedEventTeam2.id, managedEventUser2.id] },
        },
      });
      expect(eventsBeforeRemoval).toHaveLength(3);

      // Remove orgTestData.members[0] from organization
      await TeamService.removeMembers({
        teamIds: [orgTestData.team.id],
        userIds: [orgTestData.members[0].id],
        isOrg: true,
      });

      // Verify orgTestData.members[0]'s managed events in all sub-teams were deleted
      const deletedEvent1 = await prisma.eventType.findUnique({
        where: { id: managedEventTeam1.id },
      });
      expect(deletedEvent1).toBeNull();

      const deletedEvent2 = await prisma.eventType.findUnique({
        where: { id: managedEventTeam2.id },
      });
      expect(deletedEvent2).toBeNull();

      // Verify parent events still exist
      const parentEvent1Still = await prisma.eventType.findUnique({
        where: { id: parentEventInTeam1.id },
      });
      expect(parentEvent1Still).not.toBeNull();

      const parentEvent2Still = await prisma.eventType.findUnique({
        where: { id: parentEventInTeam2.id },
      });
      expect(parentEvent2Still).not.toBeNull();

      // Verify orgTestData.members[1]'s managed event was not affected
      const user2EventStill = await prisma.eventType.findUnique({
        where: { id: managedEventUser2.id },
      });
      expect(user2EventStill).not.toBeNull();

      // Verify memberships were removed from org and all sub-teams
      await expectMembershipNotExists(orgTestData.members[0].id, orgTestData.team.id);
      await expectMembershipNotExists(orgTestData.members[0].id, orgTestData.teams[0].team.id);
      await expectMembershipNotExists(orgTestData.members[0].id, secondSubTeam.id);

      // Clean up
      await prisma.eventType.deleteMany({
        where: {
          id: { in: [parentEventInTeam1.id, parentEventInTeam2.id, managedEventUser2.id] },
        },
      });
      await cleanupTestData([secondSubTeam.id], []);
    });
  });

  describe("Common Behaviors and Edge Cases", () => {
    it("should call TeamBillingService.updateQuantity for each team", async () => {
      const { getTeamBillingServiceFactory } = await import("@calcom/ee/billing/di/containers/Billing");

      await TeamService.removeMembers({
        teamIds: [regularTeamTestData.team.id],
        userIds: [orgTestData.members[0].id, orgTestData.members[1].id],
      });

      expect(getTeamBillingServiceFactory).toHaveBeenCalled();
      const mockFactory = getTeamBillingServiceFactory();
      expect(mockFactory.findAndInitMany).toHaveBeenCalledWith([regularTeamTestData.team.id]);
      const mockInstances = await mockFactory.findAndInitMany([regularTeamTestData.team.id]);
      expect(mockInstances[0].updateQuantity).toHaveBeenCalled();
    });

    it("should throw error when membership doesn't exist", async () => {
      const nonExistentUserId = 999999;

      await expect(
        TeamService.removeMembers({ teamIds: [regularTeamTestData.team.id], userIds: [nonExistentUserId] })
      ).rejects.toThrow("Membership not found");
    });

    it("should gracefully skip when given empty arrays", async () => {
      await expect(
        TeamService.removeMembers({ teamIds: [], userIds: [orgTestData.members[0].id] })
      ).resolves.not.toThrow();
      await expect(
        TeamService.removeMembers({ teamIds: [regularTeamTestData.team.id], userIds: [] })
      ).resolves.not.toThrow();
      await expect(TeamService.removeMembers({ teamIds: [], userIds: [] })).resolves.not.toThrow();
    });

    it("should throw error on second removal attempt of same member", async () => {
      await TeamService.removeMembers({
        teamIds: [regularTeamTestData.team.id],
        userIds: [orgTestData.members[0].id],
      });

      await expect(
        TeamService.removeMembers({
          teamIds: [regularTeamTestData.team.id],
          userIds: [orgTestData.members[0].id],
        })
      ).rejects.toThrow("Membership not found");
    });

    it("should rollback all changes if any operation in transaction fails", async () => {
      // Create a user and membership for this test
      const rollbackTestUser = await createTestUser({
        username: "rollback-test-user",
        organizationId: orgTestData.team.id,
      });
      await createTestMembership(rollbackTestUser.id, orgTestData.team.id);

      // Create sub-team membership
      const subTeamForRollback = await createTestTeam({
        parentId: orgTestData.team.id,
        name: "Rollback Test Sub Team",
      });
      await createTestMembership(rollbackTestUser.id, subTeamForRollback.id);

      // Create event type and host
      const eventType = await createTestEventType(subTeamForRollback.id);
      await createTestHost(rollbackTestUser.id, eventType.id);

      // Create profile
      await prisma.profile.create({
        data: {
          uid: `profile-rollback-${Date.now()}`,
          userId: rollbackTestUser.id,
          organizationId: orgTestData.team.id,
          username: "rollback-test-user",
        },
      });

      // Create another user with the username we would try to update to
      // This will cause the user.update to fail due to unique constraint
      const conflictingUser = await createTestUser({
        username: `rollback-test-user-${rollbackTestUser.id}`, // This is what removeMember would try to set
      });

      // This should fail because of username unique constraint violation
      await expect(
        TeamService.removeMembers({
          teamIds: [orgTestData.team.id],
          userIds: [rollbackTestUser.id],
          isOrg: true,
        })
      ).rejects.toThrow();

      // Verify nothing was changed - all data should still exist due to transaction rollback
      const userAfterFailure = await prisma.user.findUnique({
        where: { id: rollbackTestUser.id },
      });
      expect(userAfterFailure?.username).toBe("rollback-test-user"); // Username unchanged
      expect(userAfterFailure?.organizationId).toBe(orgTestData.team.id); // Still in org

      // Verify memberships still exist
      await expectMembershipExists(rollbackTestUser.id, orgTestData.team.id);
      await expectMembershipExists(rollbackTestUser.id, subTeamForRollback.id);

      // Verify profile still exists
      const profile = await prisma.profile.findUnique({
        where: {
          userId_organizationId: {
            userId: rollbackTestUser.id,
            organizationId: orgTestData.team.id,
          },
        },
      });
      expect(profile).not.toBeNull();

      // Verify host still exists
      const hosts = await prisma.host.findMany({
        where: { userId: rollbackTestUser.id, eventTypeId: eventType.id },
      });
      expect(hosts).toHaveLength(1);

      // Clean up
      await prisma.eventType.delete({ where: { id: eventType.id } });
      await cleanupTestData([subTeamForRollback.id], [rollbackTestUser.id, conflictingUser.id]);
    });
  });
});
