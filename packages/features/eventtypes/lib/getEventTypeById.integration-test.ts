import { prisma } from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma";
import i18nMock from "@calcom/testing/lib/__mocks__/libServerI18n";

// import { mockNoTranslations } from "@calcom/testing/lib/bookingScenario/bookingScenario";

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

import { getRawEventType } from "./getEventTypeById";

export function mockNoTranslations() {
  console.log("Mocking i18n.getTranslation to return identity function");
  i18nMock.getTranslation.mockImplementation(() => {
    return new Promise((resolve) => {
      const identityFn = (key: string) => key;
      resolve(identityFn);
    });
  });
}

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: (key: string) => () => key,
}));

describe("getRawEventType", () => {
  const createdResources: {
    eventTypes: number[];
    users: number[];
    teams: number[];
    memberships: number[];
    profiles: number[];
  } = {
    eventTypes: [],
    users: [],
    teams: [],
    memberships: [],
    profiles: [],
  };

  // Helper functions to create test data
  const createTestUser = async (overrides?: {
    organizationId?: number;
    username?: string;
    withProfile?: boolean;
  }) => {
    const timestamp = Date.now() + Math.random();
    const username = overrides?.username ?? `testuser-${timestamp}`;
    const user = await prisma.user.create({
      data: {
        username,
        email: `testuser-${timestamp}@example.com`,
        organizationId: overrides?.organizationId,
        ...(overrides?.withProfile &&
          overrides.organizationId && {
            profiles: {
              create: {
                organizationId: overrides.organizationId,
                uid: username,
                username,
              },
            },
          }),
      },
    });
    createdResources.users.push(user.id);
    return user;
  };

  const createTestOrganization = async (overrides?: { isPlatform?: boolean }) => {
    const timestamp = Date.now() + Math.random();
    const team = await prisma.team.create({
      data: {
        name: `Test Organization ${timestamp}`,
        slug: `test-org-${timestamp}`,
        isOrganization: true,
        isPlatform: overrides?.isPlatform ?? false,
      },
    });
    createdResources.teams.push(team.id);
    return team;
  };

  const createTestTeam = async (parentId?: number) => {
    const timestamp = Date.now() + Math.random();
    const team = await prisma.team.create({
      data: {
        name: `Test Team ${timestamp}`,
        slug: `test-team-${timestamp}`,
        parentId: parentId ?? null,
      },
    });
    createdResources.teams.push(team.id);
    return team;
  };

  const createTestOrgAdmin = async (organizationId: number) => {
    const timestamp = Date.now() + Math.random();
    const user = await prisma.user.create({
      data: {
        username: `orgadmin-${timestamp}`,
        email: `orgadmin-${timestamp}@example.com`,
        organizationId,
      },
    });
    createdResources.users.push(user.id);
    return user;
  };

  const createTestTeamMember = async (teamId: number, userId: number) => {
    const membership = await prisma.membership.create({
      data: {
        teamId,
        userId,
        role: "MEMBER",
        accepted: true,
      },
    });
    createdResources.memberships.push(membership.id);
    return membership;
  };

  const createTestEventType = async (userId: number, overrides?: { slug?: string; title?: string }) => {
    const timestamp = Date.now() + Math.random();
    const eventType = await prisma.eventType.create({
      data: {
        title: overrides?.title ?? "Test Event Type",
        slug: overrides?.slug ?? `test-event-${timestamp}`,
        length: 30,
        userId,
        users: {
          connect: [{ id: userId }],
        },
      },
      include: {
        users: true,
      },
    });
    createdResources.eventTypes.push(eventType.id);
    return eventType;
  };

  const createTestTeamEventType = async (teamId: number) => {
    const timestamp = Date.now() + Math.random();
    const eventType = await prisma.eventType.create({
      data: {
        title: `Team Event ${timestamp}`,
        slug: `team-event-${timestamp}`,
        length: 30,
        teamId,
      },
      include: {
        team: true,
        users: true,
      },
    });
    createdResources.eventTypes.push(eventType.id);
    return eventType;
  };

  beforeEach(() => {
    mockNoTranslations();
    // Reset tracking arrays
    createdResources.eventTypes = [];
    createdResources.users = [];
    createdResources.teams = [];
    createdResources.memberships = [];
    createdResources.profiles = [];
  });

  afterEach(async () => {
    // Clean up in reverse order to avoid foreign key violations
    if (createdResources.eventTypes.length > 0) {
      await prisma.eventType.deleteMany({
        where: { id: { in: createdResources.eventTypes } },
      });
    }
    if (createdResources.memberships.length > 0) {
      await prisma.membership.deleteMany({
        where: { id: { in: createdResources.memberships } },
      });
    }
    if (createdResources.profiles.length > 0) {
      await prisma.profile.deleteMany({
        where: { id: { in: createdResources.profiles } },
      });
    }
    if (createdResources.teams.length > 0) {
      await prisma.team.deleteMany({
        where: { id: { in: createdResources.teams } },
      });
    }
    if (createdResources.users.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdResources.users } },
      });
    }
  });

  describe("Regular user access", () => {
    test("should fetch event type when user owns it", async () => {
      const user = await createTestUser();
      const eventType = await createTestEventType(user.id);

      const result = await getRawEventType({
        userId: user.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: false,
        currentOrganizationId: null,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(eventType.id);
      expect(result?.title).toBe("Test Event Type");
      expect(result?.userId).toBe(user.id);
    });

    test.skip("should return null when user doesn't have access to event type", async () => {
      // note(Lauris): test skipped because somehow when creating event type eventType.users includes otherUser
      const owner = await prisma.user.create({
        data: {
          username: "owner",
          email: "owner1@example.com",
        },
      });

      const otherUser = await prisma.user.create({
        data: {
          username: "otheruser",
          email: "otheruser@example.com",
        },
      });

      const eventType = await prisma.eventType.create({
        data: {
          title: "Owner's Event Type",
          slug: "owner-event",
          length: 30,
          userId: owner.id,
          users: {
            connect: [{ id: owner.id }],
          },
        },
        select: {
          id: true,
          userId: true,
          users: true,
        },
      });

      await prisma.user.update({
        where: {
          id: otherUser.id,
        },
        data: {
          eventTypes: {
            disconnect: [{ id: eventType.id }],
          },
        },
      });

      const result = await getRawEventType({
        userId: otherUser.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: false,
        currentOrganizationId: null,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeNull();
    });
  });

  describe("Organization admin access", () => {
    test("should fetch team event type when user is org admin and is a team member", async () => {
      const organization = await createTestOrganization();
      const team = await createTestTeam(organization.id);
      const orgAdmin = await createTestOrgAdmin(organization.id);
      await createTestTeamMember(team.id, orgAdmin.id);
      const eventType = await createTestTeamEventType(team.id);

      const result = await getRawEventType({
        userId: orgAdmin.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: organization.id,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(eventType.id);
      expect(result?.title).toContain("Team Event");
      expect(result?.teamId).toBe(team.id);
    });

    test("should return null when org admin tries to access event type from different org", async () => {
      const org1 = await createTestOrganization();
      const org2 = await createTestOrganization();
      const team1 = await createTestTeam(org1.id);
      const org2Admin = await createTestOrgAdmin(org2.id);
      const eventType = await createTestTeamEventType(team1.id);

      const result = await getRawEventType({
        userId: org2Admin.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: org2.id,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeNull();
    });

    test("should fallback to regular user access when org admin flag is true but no organizationId", async () => {
      const user = await createTestUser();
      const eventType = await createTestEventType(user.id, { title: "Regular User Event" });

      const result = await getRawEventType({
        userId: user.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: null,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(eventType.id);
      expect(result?.userId).toBe(user.id);
    });
  });

  describe("when user is platform organization admin", () => {
    test("should access any team event type within the platform organization", async () => {
      const platformOrg = await createTestOrganization({ isPlatform: true });
      const orgSubTeam = await createTestTeam(platformOrg.id);
      const platformAdmin = await createTestOrgAdmin(platformOrg.id);
      const teamEvent = await createTestTeamEventType(orgSubTeam.id);

      const result = await getRawEventType({
        userId: platformAdmin.id,
        eventTypeId: teamEvent.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: platformOrg.id,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(teamEvent.id);
      expect(result?.teamId).toBe(orgSubTeam.id);
    });

    test("should access user event types within the platform organization", async () => {
      const platformOrg = await createTestOrganization({ isPlatform: true });
      const platformAdmin = await createTestOrgAdmin(platformOrg.id);
      const orgUser = await createTestUser({ organizationId: platformOrg.id, withProfile: true });
      const userEvent = await createTestEventType(orgUser.id, { title: "Platform User Event" });

      const result = await getRawEventType({
        userId: platformAdmin.id,
        eventTypeId: userEvent.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: platformOrg.id,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(userEvent.id);
      expect(result?.userId).toBe(orgUser.id);
    });
  });

  describe("when user is non-platform organization admin", () => {
    test("should access regular team event when admin is a team member", async () => {
      const regularOrg = await createTestOrganization({ isPlatform: false });
      const standaloneTeam = await createTestTeam();
      const orgAdmin = await createTestOrgAdmin(regularOrg.id);
      await createTestTeamMember(standaloneTeam.id, orgAdmin.id);
      const teamEvent = await createTestTeamEventType(standaloneTeam.id);

      const result = await getRawEventType({
        userId: orgAdmin.id,
        eventTypeId: teamEvent.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: regularOrg.id,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(teamEvent.id);
      expect(result?.teamId).toBe(standaloneTeam.id);
    });

    test("should not access regular team event when admin is not a team member", async () => {
      const regularOrg = await createTestOrganization({ isPlatform: false });
      const standaloneTeam = await createTestTeam();
      const orgAdmin = await createTestOrgAdmin(regularOrg.id);
      const teamEvent = await createTestTeamEventType(standaloneTeam.id);

      const result = await getRawEventType({
        userId: orgAdmin.id,
        eventTypeId: teamEvent.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: regularOrg.id,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeNull();
    });

    test("should not access organization sub-team event when admin is not a team member", async () => {
      const regularOrg = await createTestOrganization({ isPlatform: false });
      const orgSubTeam = await createTestTeam(regularOrg.id);
      const orgAdmin = await createTestOrgAdmin(regularOrg.id);
      const subTeamEvent = await createTestTeamEventType(orgSubTeam.id);

      const result = await getRawEventType({
        userId: orgAdmin.id,
        eventTypeId: subTeamEvent.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: regularOrg.id,
        prisma: prisma as unknown as PrismaClient,
      });

      expect(result).toBeNull();
    });
  });
});
