import prismock from "../../../../tests/libs/__mocks__/prisma";

import { mockNoTranslations } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { describe, test, expect, beforeEach, vi } from "vitest";

import { getRawEventType } from "./getEventTypeById";

vi.mock("@calcom/lib/server/i18n", () => ({
  getTranslation: (key: string) => () => key,
}));

describe("getRawEventType", () => {
  beforeEach(() => {
    mockNoTranslations();
  });

  describe("Regular user access", () => {
    test("should fetch event type when user owns it", async () => {
      const user = await prismock.user.create({
        data: {
          username: "testuser",
          email: "testuser@example.com",
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          title: "Test Event Type",
          slug: "test-event",
          length: 30,
          userId: user.id,
          users: {
            connect: [{ id: user.id }],
          },
        },
        include: {
          users: true,
        },
      });

      const result = await getRawEventType({
        userId: user.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: false,
        currentOrganizationId: null,
        prisma: prismock as any,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(eventType.id);
      expect(result?.title).toBe("Test Event Type");
      expect(result?.userId).toBe(user.id);
    });

    test.skip("should return null when user doesn't have access to event type", async () => {
      // note(Lauris): test skipped because somehow when creating event type eventType.users includes otherUser
      const owner = await prismock.user.create({
        data: {
          username: "owner",
          email: "owner1@example.com",
        },
      });

      const otherUser = await prismock.user.create({
        data: {
          username: "otheruser",
          email: "otheruser@example.com",
        },
      });

      const eventType = await prismock.eventType.create({
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

      await prismock.user.update({
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
        prisma: prismock as any,
      });

      expect(result).toBeNull();
    });
  });

  describe("Organization admin access", () => {
    test("should fetch team event type when user is org admin", async () => {
      const organization = await prismock.team.create({
        data: {
          id: 100,
          name: "Test Organization",
          slug: "test-org",
          isOrganization: true,
        },
      });

      const team = await prismock.team.create({
        data: {
          id: 200,
          name: "Test Team",
          slug: "test-team",
          parentId: organization.id,
        },
      });

      const orgAdmin = await prismock.user.create({
        data: {
          username: "orgadmin",
          email: "orgadmin@example.com",
          organizationId: organization.id,
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          title: "Team Event Type",
          slug: "team-event",
          length: 30,
          teamId: team.id,
        },
        include: {
          team: true,
          users: true,
        },
      });

      const result = await getRawEventType({
        userId: orgAdmin.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: organization.id,
        prisma: prismock as any,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(eventType.id);
      expect(result?.title).toBe("Team Event Type");
      expect(result?.teamId).toBe(team.id);
    });

    test("should fetch user event type when user is org admin and user belongs to org", async () => {
      const organization = await prismock.team.create({
        data: {
          id: 101,
          name: "Test Organization 2",
          slug: "test-org-2",
          isOrganization: true,
        },
      });

      const orgAdmin = await prismock.user.create({
        data: {
          username: "orgadmin2",
          email: "orgadmin2@example.com",
          organizationId: organization.id,
        },
      });

      const orgUser = await prismock.user.create({
        data: {
          username: "orguser",
          email: "orguser@example.com",
          organizationId: organization.id,
          profiles: {
            create: {
              organizationId: organization.id,
              uid: "orguser",
              username: "orguser",
            },
          },
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          title: "Org User Event Type",
          slug: "org-user-event",
          length: 30,
          userId: orgUser.id,
          users: {
            connect: [{ id: orgUser.id }],
          },
        },
        include: {
          users: true,
          owner: true,
        },
      });

      const result = await getRawEventType({
        userId: orgAdmin.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: organization.id,
        prisma: prismock as any,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(eventType.id);
      expect(result?.title).toBe("Org User Event Type");
      expect(result?.userId).toBe(orgUser.id);
    });

    test("should return null when org admin tries to access event type from different org", async () => {
      const org1 = await prismock.team.create({
        data: {
          id: 102,
          name: "Organization 1",
          slug: "org-1",
          isOrganization: true,
        },
      });

      const org2 = await prismock.team.create({
        data: {
          id: 103,
          name: "Organization 2",
          slug: "org-2",
          isOrganization: true,
        },
      });

      const team1 = await prismock.team.create({
        data: {
          id: 201,
          name: "Team in Org 1",
          slug: "team-org-1",
          parentId: org1.id,
        },
      });

      const org2Admin = await prismock.user.create({
        data: {
          username: "org2admin",
          email: "org2admin@example.com",
          organizationId: org2.id,
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          title: "Org 1 Team Event",
          slug: "org1-team-event",
          length: 30,
          teamId: team1.id,
        },
        include: {
          team: true,
          users: true,
        },
      });

      const result = await getRawEventType({
        userId: org2Admin.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: org2.id,
        prisma: prismock as any,
      });

      expect(result).toBeNull();
    });

    test("should fallback to regular user access when org admin flag is true but no organizationId", async () => {
      const user = await prismock.user.create({
        data: {
          username: "regularuser",
          email: "regularuser@example.com",
        },
      });

      const eventType = await prismock.eventType.create({
        data: {
          title: "Regular User Event",
          slug: "regular-user-event",
          length: 30,
          userId: user.id,
          users: {
            connect: [{ id: user.id }],
          },
        },
        include: {
          users: true,
          owner: true,
        },
      });

      const result = await getRawEventType({
        userId: user.id,
        eventTypeId: eventType.id,
        isUserOrganizationAdmin: true,
        currentOrganizationId: null,
        prisma: prismock as any,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(eventType.id);
      expect(result?.userId).toBe(user.id);
    });
  });
});
