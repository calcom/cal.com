import type { Team, User } from "@prisma/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { TeamService } from "../teamService";

vi.mock("@calcom/features/ee/billing/teams", () => {
  const mockUpdateQuantity = vi.fn().mockResolvedValue(undefined);
  const mockTeamBilling = {
    updateQuantity: mockUpdateQuantity,
  };

  return {
    TeamBilling: {
      findAndInitMany: vi.fn().mockResolvedValue([mockTeamBilling]),
    },
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
  let testOrg: Team;
  let testTeam: Team;
  let testSubTeam: Team;
  let testUser1: User;
  let testUser2: User;
  let testUser3: User;

  beforeEach(async () => {
    testOrg = await createTestTeam({ isOrganization: true });
    testTeam = await createTestTeam({ parentId: testOrg.id });
    testSubTeam = await createTestTeam({ parentId: testOrg.id });

    testUser1 = await createTestUser({ organizationId: testOrg.id });
    testUser2 = await createTestUser({ organizationId: testOrg.id });
    testUser3 = await createTestUser();

    await createTestMembership(testUser1.id, testOrg.id);
    await createTestMembership(testUser2.id, testOrg.id);
    await createTestMembership(testUser1.id, testTeam.id);
    await createTestMembership(testUser2.id, testTeam.id);
    await createTestMembership(testUser1.id, testSubTeam.id);
    await createTestMembership(testUser3.id, testTeam.id);
  });

  afterEach(async () => {
    await cleanupTestData(
      [testSubTeam.id, testTeam.id, testOrg.id],
      [testUser1.id, testUser2.id, testUser3.id]
    );
    vi.clearAllMocks();
  });

  it("should remove members from a single team", async () => {
    await TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [testUser1.id, testUser2.id] });

    await expectMembershipNotExists(testUser1.id, testTeam.id);
    await expectMembershipNotExists(testUser2.id, testTeam.id);
    await expectMembershipExists(testUser3.id, testTeam.id);

    await expectMembershipCount(testTeam.id, 1);

    await expectMembershipExists(testUser1.id, testOrg.id);
    await expectMembershipExists(testUser2.id, testOrg.id);
  });

  it("should remove members from multiple teams", async () => {
    await TeamService.removeMembers({ teamIds: [testTeam.id, testSubTeam.id], memberIds: [testUser1.id] });

    await expectMembershipNotExists(testUser1.id, testTeam.id);
    await expectMembershipNotExists(testUser1.id, testSubTeam.id);

    await expectMembershipExists(testUser2.id, testTeam.id);
    await expectMembershipExists(testUser3.id, testTeam.id);
    await expectMembershipCount(testTeam.id, 2);
  });

  it("should remove members from organization and all sub-teams", async () => {
    const originalUsername = testUser1.username || "";

    await TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [testUser1.id], isOrg: true });

    await expectMembershipNotExists(testUser1.id, testOrg.id);
    await expectMembershipNotExists(testUser1.id, testTeam.id);
    await expectMembershipNotExists(testUser1.id, testSubTeam.id);

    await expectUserOrganization(testUser1.id, null);
    await expectUserUsername(testUser1.id, `${originalUsername}-${testUser1.id}`);
  });

  it("should handle removing multiple members from organization", async () => {
    await TeamService.removeMembers({
      teamIds: [testOrg.id],
      memberIds: [testUser1.id, testUser2.id],
      isOrg: true,
    });

    await expectMembershipNotExists(testUser1.id, testOrg.id);
    await expectMembershipNotExists(testUser2.id, testOrg.id);
    await expectMembershipNotExists(testUser1.id, testTeam.id);
    await expectMembershipNotExists(testUser2.id, testTeam.id);
    await expectMembershipNotExists(testUser1.id, testSubTeam.id);

    await expectMembershipExists(testUser3.id, testTeam.id);
  });

  it("should delete managed event types when removing members", async () => {
    const parentEventType = await createTestEventType(testTeam.id);
    const managedEventType = await createTestEventType(testTeam.id, {
      userId: testUser1.id,
      parentId: parentEventType.id,
    });

    await TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [testUser1.id] });

    const deletedEventType = await prisma.eventType.findUnique({
      where: { id: managedEventType.id },
    });
    expect(deletedEventType).toBeNull();

    await prisma.eventType.delete({
      where: { id: parentEventType.id },
    });
  });

  it("should delete host assignments when removing from organization", async () => {
    const eventType = await createTestEventType(testTeam.id);
    await createTestHost(testUser1.id, eventType.id);

    await TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [testUser1.id], isOrg: true });

    const hosts = await prisma.host.findMany({
      where: {
        userId: testUser1.id,
        eventTypeId: eventType.id,
      },
    });
    expect(hosts).toHaveLength(0);

    await prisma.eventType.delete({
      where: { id: eventType.id },
    });
  });

  it("should remove hosts from team events when removing team member", async () => {
    // Create a team member
    const teamMember = await createTestUser();
    await createTestMembership(teamMember.id, testTeam.id);

    // Create multiple event types for the team
    const teamEvent1 = await createTestEventType(testTeam.id, {
      title: "Team Event 1",
      slug: "team-event-1",
    });

    const teamEvent2 = await createTestEventType(testTeam.id, {
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
    await createTestMembership(anotherUser.id, testTeam.id);
    await createTestHost(anotherUser.id, teamEvent1.id);

    // Verify hosts exist before removal
    const hostsBefore = await prisma.host.findMany({
      where: { userId: teamMember.id },
    });
    expect(hostsBefore).toHaveLength(3);

    // Remove member from team (not org)
    await TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [teamMember.id], isOrg: false });

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
    await expectMembershipNotExists(teamMember.id, testTeam.id);

    // Clean up
    await prisma.eventType.deleteMany({
      where: { id: { in: [teamEvent1.id, teamEvent2.id, otherTeamEvent.id] } },
    });
    await cleanupTestData([otherTeam.id], [teamMember.id, anotherUser.id]);
  });

  it("should delete managed event types when removing from team", async () => {
    // Create parent event types
    const parentEventType1 = await createTestEventType(testTeam.id, {
      title: "Parent Team Event 1",
      slug: "parent-team-event-1",
    });

    const parentEventType2 = await createTestEventType(testTeam.id, {
      title: "Parent Team Event 2",
      slug: "parent-team-event-2",
    });

    // Create managed event types for the user (one per parent)
    const managedEventType1 = await createTestEventType(testTeam.id, {
      userId: testUser1.id,
      parentId: parentEventType1.id,
      title: "Managed Event 1",
      slug: "managed-event-1",
    });

    const managedEventType2 = await createTestEventType(testTeam.id, {
      userId: testUser1.id,
      parentId: parentEventType2.id,
      title: "Managed Event 2",
      slug: "managed-event-2",
    });

    // Create a managed event type for another user (should not be affected)
    const otherUserManagedEvent = await createTestEventType(testTeam.id, {
      userId: testUser2.id,
      parentId: parentEventType1.id,
      title: "Other User Managed Event",
      slug: "other-user-managed-event",
    });

    // Remove testUser1 from team
    await TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [testUser1.id], isOrg: false });

    // Verify testUser1's managed event types were deleted
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

  it("should call TeamBilling.updateQuantity for each team", async () => {
    const { TeamBilling } = await import("@calcom/features/ee/billing/teams");

    await TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [testUser1.id, testUser2.id] });

    expect(TeamBilling.findAndInitMany).toHaveBeenCalledWith([testTeam.id]);
    const mockInstances = await TeamBilling.findAndInitMany([testTeam.id]);
    expect(mockInstances[0].updateQuantity).toHaveBeenCalled();
  });

  it("should handle errors when membership doesn't exist", async () => {
    const nonExistentUserId = 999999;

    await expect(
      TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [nonExistentUserId] })
    ).rejects.toThrow("Membership not found");
  });

  it("should handle empty arrays", async () => {
    await expect(
      TeamService.removeMembers({ teamIds: [], memberIds: [testUser1.id] })
    ).resolves.not.toThrow();
    await expect(TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [] })).resolves.not.toThrow();
    await expect(TeamService.removeMembers({ teamIds: [], memberIds: [] })).resolves.not.toThrow();
  });

  it("should prevent username conflicts when removing from organization", async () => {
    const sharedUsername = `sharedusername-${Date.now()}`;

    const userInOrg = await createTestUser({
      username: sharedUsername,
      organizationId: testOrg.id,
    });
    await createTestMembership(userInOrg.id, testOrg.id);

    const userOutsideOrg = await createTestUser({
      username: sharedUsername,
      organizationId: null,
    });

    await TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [userInOrg.id], isOrg: true });

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

  it("should handle users with null username when removing from organization", async () => {
    const userWithNullUsername = await createTestUser({
      username: null,
      organizationId: testOrg.id,
    });
    await createTestMembership(userWithNullUsername.id, testOrg.id);

    await TeamService.removeMembers({
      teamIds: [testOrg.id],
      memberIds: [userWithNullUsername.id],
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
    const profileUser = await createTestUser({ organizationId: testOrg.id });
    await createTestMembership(profileUser.id, testOrg.id);

    const profile = await prisma.profile.create({
      data: {
        uid: `profile-${Date.now()}`,
        userId: profileUser.id,
        organizationId: testOrg.id,
        username: profileUser.username || "",
      },
    });

    await TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [profileUser.id], isOrg: true });

    const deletedProfile = await prisma.profile.findUnique({
      where: { id: profile.id },
    });
    expect(deletedProfile).toBeNull();

    await cleanupTestData([], [profileUser.id]);
  });

  it("should handle removing member without profile from organization", async () => {
    const userWithoutProfile = await createTestUser({ organizationId: testOrg.id });
    await createTestMembership(userWithoutProfile.id, testOrg.id);

    await expect(
      TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [userWithoutProfile.id], isOrg: true })
    ).resolves.not.toThrow();

    await expectMembershipNotExists(userWithoutProfile.id, testOrg.id);
    await cleanupTestData([], [userWithoutProfile.id]);
  });

  it("should handle removing members from team with isOrg flag", async () => {
    await TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [testUser1.id], isOrg: true });

    await expectMembershipNotExists(testUser1.id, testTeam.id);

    const user = await prisma.user.findUnique({
      where: { id: testUser1.id },
    });
    // When isOrg is true, it still updates organizationId to null and modifies username
    expect(user?.organizationId).toBeNull();
    expect(user?.username).toBe(`${testUser1.username}-${testUser1.id}`);
  });

  it("should clean up tempOrgRedirect when user movedToProfileId matches", async () => {
    const userWithProfile = await createTestUser({ organizationId: testOrg.id });
    await createTestMembership(userWithProfile.id, testOrg.id);

    const profile = await prisma.profile.create({
      data: {
        uid: `profile-temp-${Date.now()}`,
        userId: userWithProfile.id,
        organizationId: testOrg.id,
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
        fromOrgId: testOrg.id,
        toUrl: "https://example.com",
      },
    });

    await TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [userWithProfile.id], isOrg: true });

    const redirects = await prisma.tempOrgRedirect.findMany({
      where: { from: userWithProfile.username || "" },
    });
    expect(redirects).toHaveLength(0);

    await cleanupTestData([], [userWithProfile.id]);
  });

  it("should handle sequential removal attempts of same member", async () => {
    await TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [testUser1.id] });

    await expect(
      TeamService.removeMembers({ teamIds: [testTeam.id], memberIds: [testUser1.id] })
    ).rejects.toThrow("Membership not found");
  });

  it("should rollback all changes if any operation in transaction fails", async () => {
    // Create a user and membership for this test
    const rollbackTestUser = await createTestUser({
      username: "rollback-test-user",
      organizationId: testOrg.id,
    });
    await createTestMembership(rollbackTestUser.id, testOrg.id);

    // Create sub-team membership
    const subTeamForRollback = await createTestTeam({
      parentId: testOrg.id,
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
        organizationId: testOrg.id,
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
      TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [rollbackTestUser.id], isOrg: true })
    ).rejects.toThrow();

    // Verify nothing was changed - all data should still exist due to transaction rollback
    const userAfterFailure = await prisma.user.findUnique({
      where: { id: rollbackTestUser.id },
    });
    expect(userAfterFailure?.username).toBe("rollback-test-user"); // Username unchanged
    expect(userAfterFailure?.organizationId).toBe(testOrg.id); // Still in org

    // Verify memberships still exist
    await expectMembershipExists(rollbackTestUser.id, testOrg.id);
    await expectMembershipExists(rollbackTestUser.id, subTeamForRollback.id);

    // Verify profile still exists
    const profile = await prisma.profile.findUnique({
      where: {
        userId_organizationId: {
          userId: rollbackTestUser.id,
          organizationId: testOrg.id,
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

  it("should handle non-empty username when removing from organization", async () => {
    const userWithUsername = await prisma.user.create({
      data: {
        email: `member8-acme-${Date.now()}@example.com`,
        username: "member8-acme",
        organizationId: testOrg.id,
      },
    });
    await createTestMembership(userWithUsername.id, testOrg.id);

    // Create a profile to match real-world scenario
    const profile = await prisma.profile.create({
      data: {
        uid: `profile-${Date.now()}`,
        userId: userWithUsername.id,
        organizationId: testOrg.id,
        username: "member8-acme", // Profile has same username
      },
    });

    await TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [userWithUsername.id], isOrg: true });

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

  it("should handle user with null username but profile with username", async () => {
    const userWithNullUsername = await prisma.user.create({
      data: {
        email: `null-username-user-${Date.now()}@example.com`,
        username: null, // User has null username
        organizationId: testOrg.id,
      },
    });
    await createTestMembership(userWithNullUsername.id, testOrg.id);

    // Create a profile with username
    const profile = await prisma.profile.create({
      data: {
        uid: `profile-null-user-${Date.now()}`,
        userId: userWithNullUsername.id,
        organizationId: testOrg.id,
        username: "member8-acme", // Profile has username
      },
    });

    await TeamService.removeMembers({
      teamIds: [testOrg.id],
      memberIds: [userWithNullUsername.id],
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

  it("should handle empty string username when removing from organization", async () => {
    const userWithEmptyUsername = await prisma.user.create({
      data: {
        email: `empty-username-${Date.now()}@example.com`,
        username: "", // Empty string, not null
        organizationId: testOrg.id,
      },
    });
    await createTestMembership(userWithEmptyUsername.id, testOrg.id);

    await TeamService.removeMembers({
      teamIds: [testOrg.id],
      memberIds: [userWithEmptyUsername.id],
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

  it("should handle API v2 style deletion with sub-team hosts", async () => {
    // This test simulates exactly what happens in API v2 deletion
    const apiUser = await prisma.user.create({
      data: {
        email: `api-test-${Date.now()}@example.com`,
        username: "member8-acme", // Using the exact username from the issue
        organizationId: testOrg.id,
      },
    });

    // Create membership in org
    await createTestMembership(apiUser.id, testOrg.id);

    // Create a sub-team (like in API v2 test)
    const apiSubTeam = await createTestTeam({
      parentId: testOrg.id,
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
        organizationId: testOrg.id,
        username: "member8-acme",
      },
    });

    // Now remove from organization (what API v2 does)
    await TeamService.removeMembers({ teamIds: [testOrg.id], memberIds: [apiUser.id], isOrg: true });

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
});
