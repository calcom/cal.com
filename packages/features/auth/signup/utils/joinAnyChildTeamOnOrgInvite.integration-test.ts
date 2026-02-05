import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { prisma } from "@calcom/prisma";
import type { Team, User, OrganizationSettings } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { joinAnyChildTeamOnOrgInvite } from "./organization";

function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

async function createTestUser(data: {
  email: string;
  username: string;
  organizationId?: number | null;
}): Promise<User> {
  const uniqueId = generateUniqueId();
  const uniqueEmail = data.email.includes("@")
    ? data.email.replace("@", `-${uniqueId}@`)
    : `${data.email}-${uniqueId}@example.com`;
  const uniqueUsername = `${data.username}-${uniqueId}`;

  return await prisma.user.create({
    data: {
      email: uniqueEmail,
      username: uniqueUsername,
      organizationId: data.organizationId ?? undefined,
    },
  });
}

async function createTestOrganization(data: {
  name: string;
  slug: string;
  orgAutoAcceptEmail?: string;
}): Promise<Team & { organizationSettings: OrganizationSettings | null }> {
  const uniqueId = generateUniqueId();
  const uniqueSlug = `${data.slug}-${uniqueId}`;

  const team = await prisma.team.create({
    data: {
      name: `${data.name} ${uniqueId}`,
      slug: uniqueSlug,
      isOrganization: true,
    },
  });

  let organizationSettings: OrganizationSettings | null = null;
  if (data.orgAutoAcceptEmail) {
    organizationSettings = await prisma.organizationSettings.create({
      data: {
        organizationId: team.id,
        orgAutoAcceptEmail: data.orgAutoAcceptEmail,
        isOrganizationVerified: true,
      },
    });
  }

  return { ...team, organizationSettings };
}

async function createTestSubteam(data: {
  name: string;
  slug: string;
  parentId: number;
}): Promise<Team> {
  const uniqueId = generateUniqueId();
  const uniqueSlug = `${data.slug}-${uniqueId}`;

  return await prisma.team.create({
    data: {
      name: `${data.name} ${uniqueId}`,
      slug: uniqueSlug,
      isOrganization: false,
      parentId: data.parentId,
    },
  });
}

async function createTestEventType(data: {
  teamId: number;
  title: string;
  slug: string;
  assignAllTeamMembers?: boolean;
  schedulingType?: SchedulingType;
}) {
  const uniqueId = generateUniqueId();
  return await prisma.eventType.create({
    data: {
      title: `${data.title} ${uniqueId}`,
      slug: `${data.slug}-${uniqueId}`,
      teamId: data.teamId,
      length: 30,
      assignAllTeamMembers: data.assignAllTeamMembers ?? false,
      schedulingType: data.schedulingType ?? SchedulingType.COLLECTIVE,
    },
  });
}

describe("joinAnyChildTeamOnOrgInvite Integration Tests", () => {
  let testUsers: User[] = [];
  let testTeams: Team[] = [];
  let testEventTypeIds: number[] = [];

  beforeEach(() => {
    testUsers = [];
    testTeams = [];
    testEventTypeIds = [];
  });

  afterEach(async () => {
    const userIds = testUsers.map((u) => u.id);
    const teamIds = testTeams.map((t) => t.id);

    if (userIds.length > 0 || teamIds.length > 0 || testEventTypeIds.length > 0) {
      // Clean up in reverse dependency order
      await prisma.host.deleteMany({
        where: {
          OR: [{ userId: { in: userIds } }, { eventTypeId: { in: testEventTypeIds } }],
        },
      });
      await prisma.eventType.deleteMany({
        where: { id: { in: testEventTypeIds } },
      });
      await prisma.profile.deleteMany({
        where: {
          OR: [{ userId: { in: userIds } }, { organizationId: { in: teamIds } }],
        },
      });
      await prisma.membership.deleteMany({
        where: {
          OR: [{ userId: { in: userIds } }, { teamId: { in: teamIds } }],
        },
      });
      await prisma.organizationSettings.deleteMany({
        where: { organizationId: { in: teamIds } },
      });
      await prisma.team.deleteMany({
        where: { id: { in: teamIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  });

  function trackUser(user: User): User {
    testUsers.push(user);
    return user;
  }

  function trackTeam(team: Team): Team {
    testTeams.push(team);
    return team;
  }

  function trackEventType(eventType: { id: number }): void {
    testEventTypeIds.push(eventType.id);
  }

  describe("Host creation for child team event types with assignAllTeamMembers", () => {
    it("should create host records for child team event types with assignAllTeamMembers=true when accepting org invite", async () => {
      // Setup: Create organization with a child team
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const childTeam = trackTeam(
        await createTestSubteam({
          name: "Child Team",
          slug: "child-team",
          parentId: org.id,
        })
      );

      // Create event type on child team with assignAllTeamMembers=true
      const eventType = await createTestEventType({
        teamId: childTeam.id,
        title: "Team Meeting",
        slug: "team-meeting",
        assignAllTeamMembers: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
      });
      trackEventType(eventType);

      // Create user who will be invited
      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending org membership (simulating invite)
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Create pending child team membership (simulating invite to child team)
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act: User accepts org invite
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: Host record should be created for the child team event type
      const hostRecord = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: eventType.id,
        },
      });

      expect(hostRecord).not.toBeNull();
      expect(hostRecord?.userId).toBe(user.id);
      expect(hostRecord?.eventTypeId).toBe(eventType.id);
    });

    it("should create host records for multiple child teams with assignAllTeamMembers event types", async () => {
      // Setup: Create organization with multiple child teams
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const childTeam1 = trackTeam(
        await createTestSubteam({
          name: "Sales Team",
          slug: "sales-team",
          parentId: org.id,
        })
      );

      const childTeam2 = trackTeam(
        await createTestSubteam({
          name: "Support Team",
          slug: "support-team",
          parentId: org.id,
        })
      );

      // Create event types with assignAllTeamMembers=true on both child teams
      const eventType1 = await createTestEventType({
        teamId: childTeam1.id,
        title: "Sales Call",
        slug: "sales-call",
        assignAllTeamMembers: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
      });
      trackEventType(eventType1);

      const eventType2 = await createTestEventType({
        teamId: childTeam2.id,
        title: "Support Session",
        slug: "support-session",
        assignAllTeamMembers: true,
        schedulingType: SchedulingType.COLLECTIVE,
      });
      trackEventType(eventType2);

      // Create user
      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending memberships for org and both child teams
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam1.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam2.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act: User accepts org invite
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: Host records should be created for both child team event types
      const hostRecord1 = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: eventType1.id,
        },
      });

      const hostRecord2 = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: eventType2.id,
        },
      });

      expect(hostRecord1).not.toBeNull();
      expect(hostRecord1?.userId).toBe(user.id);
      expect(hostRecord1?.eventTypeId).toBe(eventType1.id);

      expect(hostRecord2).not.toBeNull();
      expect(hostRecord2?.userId).toBe(user.id);
      expect(hostRecord2?.eventTypeId).toBe(eventType2.id);
    });

    it("should not create host records for event types without assignAllTeamMembers", async () => {
      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const childTeam = trackTeam(
        await createTestSubteam({
          name: "Child Team",
          slug: "child-team",
          parentId: org.id,
        })
      );

      // Create event type WITHOUT assignAllTeamMembers
      const eventType = await createTestEventType({
        teamId: childTeam.id,
        title: "Regular Meeting",
        slug: "regular-meeting",
        assignAllTeamMembers: false,
        schedulingType: SchedulingType.ROUND_ROBIN,
      });
      trackEventType(eventType);

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending memberships
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: No host record should be created
      const hostRecord = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: eventType.id,
        },
      });

      expect(hostRecord).toBeNull();
    });

    it("should only create host records for child teams with pending memberships", async () => {
      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const childTeamWithPending = trackTeam(
        await createTestSubteam({
          name: "Team With Pending",
          slug: "team-with-pending",
          parentId: org.id,
        })
      );

      const childTeamWithoutPending = trackTeam(
        await createTestSubteam({
          name: "Team Without Pending",
          slug: "team-without-pending",
          parentId: org.id,
        })
      );

      // Create event types with assignAllTeamMembers=true on both teams
      const eventTypeWithPending = await createTestEventType({
        teamId: childTeamWithPending.id,
        title: "Meeting With Pending",
        slug: "meeting-with-pending",
        assignAllTeamMembers: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
      });
      trackEventType(eventTypeWithPending);

      const eventTypeWithoutPending = await createTestEventType({
        teamId: childTeamWithoutPending.id,
        title: "Meeting Without Pending",
        slug: "meeting-without-pending",
        assignAllTeamMembers: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
      });
      trackEventType(eventTypeWithoutPending);

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending org membership
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Create pending membership ONLY for childTeamWithPending
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeamWithPending.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Note: No membership for childTeamWithoutPending

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: Host record should only be created for the team with pending membership
      const hostRecordWithPending = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: eventTypeWithPending.id,
        },
      });

      const hostRecordWithoutPending = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: eventTypeWithoutPending.id,
        },
      });

      expect(hostRecordWithPending).not.toBeNull();
      expect(hostRecordWithoutPending).toBeNull();
    });

    it("should set isFixed=true for COLLECTIVE scheduling type hosts", async () => {
      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const childTeam = trackTeam(
        await createTestSubteam({
          name: "Child Team",
          slug: "child-team",
          parentId: org.id,
        })
      );

      // Create COLLECTIVE event type with assignAllTeamMembers=true
      const collectiveEventType = await createTestEventType({
        teamId: childTeam.id,
        title: "Collective Meeting",
        slug: "collective-meeting",
        assignAllTeamMembers: true,
        schedulingType: SchedulingType.COLLECTIVE,
      });
      trackEventType(collectiveEventType);

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending memberships
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: Host record should have isFixed=true for COLLECTIVE
      const hostRecord = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: collectiveEventType.id,
        },
      });

      expect(hostRecord).not.toBeNull();
      expect(hostRecord?.isFixed).toBe(true);
    });

    it("should set isFixed=false for ROUND_ROBIN scheduling type hosts", async () => {
      // Setup
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const childTeam = trackTeam(
        await createTestSubteam({
          name: "Child Team",
          slug: "child-team",
          parentId: org.id,
        })
      );

      // Create ROUND_ROBIN event type with assignAllTeamMembers=true
      const roundRobinEventType = await createTestEventType({
        teamId: childTeam.id,
        title: "Round Robin Meeting",
        slug: "round-robin-meeting",
        assignAllTeamMembers: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
      });
      trackEventType(roundRobinEventType);

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending memberships
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: Host record should have isFixed=false for ROUND_ROBIN
      const hostRecord = await prisma.host.findFirst({
        where: {
          userId: user.id,
          eventTypeId: roundRobinEventType.id,
        },
      });

      expect(hostRecord).not.toBeNull();
      expect(hostRecord?.isFixed).toBe(false);
    });
  });

  describe("Membership acceptance", () => {
    it("should accept org membership when joining", async () => {
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending org membership
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: Membership should be accepted
      const membership = await prisma.membership.findUnique({
        where: {
          userId_teamId: {
            userId: user.id,
            teamId: org.id,
          },
        },
      });

      expect(membership?.accepted).toBe(true);
    });

    it("should accept all pending child team memberships when joining org", async () => {
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const childTeam1 = trackTeam(
        await createTestSubteam({
          name: "Child Team 1",
          slug: "child-team-1",
          parentId: org.id,
        })
      );

      const childTeam2 = trackTeam(
        await createTestSubteam({
          name: "Child Team 2",
          slug: "child-team-2",
          parentId: org.id,
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending memberships for org and both child teams
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam1.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: childTeam2.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: All memberships should be accepted
      const orgMembership = await prisma.membership.findUnique({
        where: {
          userId_teamId: { userId: user.id, teamId: org.id },
        },
      });
      expect(orgMembership?.accepted).toBe(true);

      const childTeam1Membership = await prisma.membership.findUnique({
        where: {
          userId_teamId: { userId: user.id, teamId: childTeam1.id },
        },
      });
      expect(childTeam1Membership?.accepted).toBe(true);

      const childTeam2Membership = await prisma.membership.findUnique({
        where: {
          userId_teamId: { userId: user.id, teamId: childTeam2.id },
        },
      });
      expect(childTeam2Membership?.accepted).toBe(true);
    });
  });

  describe("User and profile updates", () => {
    it("should set user organizationId when joining org", async () => {
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending org membership
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: User should have organizationId set
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.organizationId).toBe(org.id);
    });

    it("should create profile for user in organization", async () => {
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      const user = trackUser(
        await createTestUser({
          email: "user@example.com",
          username: "testuser",
        })
      );

      // Create pending org membership
      await prisma.membership.create({
        data: {
          userId: user.id,
          teamId: org.id,
          role: MembershipRole.MEMBER,
          accepted: false,
        },
      });

      // Act
      await joinAnyChildTeamOnOrgInvite({
        userId: user.id,
        org: {
          id: org.id,
          organizationSettings: org.organizationSettings,
        },
      });

      // Assert: Profile should be created
      const profile = await prisma.profile.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: org.id,
          },
        },
      });

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(user.id);
      expect(profile?.organizationId).toBe(org.id);
    });
  });

  describe("Error handling", () => {
    it("should throw error if user not found", async () => {
      const org = trackTeam(
        await createTestOrganization({
          name: "Test Org",
          slug: "test-org",
          orgAutoAcceptEmail: "example.com",
        })
      );

      // Act & Assert
      await expect(
        joinAnyChildTeamOnOrgInvite({
          userId: 999999, // Non-existent user
          org: {
            id: org.id,
            organizationSettings: org.organizationSettings,
          },
        })
      ).rejects.toThrow("User not found");
    });
  });
});
