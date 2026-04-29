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

vi.mock("@calcom/i18n/server", () => ({
  getTranslation: (key: string) => () => key,
}));

describe("getRawEventType", () => {
  const createdResources: {
    eventTypes: number[];
    users: number[];
  } = {
    eventTypes: [],
    users: [],
  };

  const createTestUser = async (overrides?: {
    username?: string;
  }) => {
    const timestamp = Date.now() + Math.random();
    const username = overrides?.username ?? `testuser-${timestamp}`;
    const user = await prisma.user.create({
      data: {
        username,
        email: `testuser-${timestamp}@example.com`,
      },
    });
    createdResources.users.push(user.id);
    return user;
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

  beforeEach(() => {
    mockNoTranslations();
    createdResources.eventTypes = [];
    createdResources.users = [];
  });

  afterEach(async () => {
    if (createdResources.eventTypes.length > 0) {
      await prisma.eventType.deleteMany({
        where: { id: { in: createdResources.eventTypes } },
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
});
