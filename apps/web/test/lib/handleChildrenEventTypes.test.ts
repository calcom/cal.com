import type { EventType } from "@prisma/client";

import updateChildrenEventTypes from "@calcom/lib/handleChildrenEventTypes";
import { buildEventType } from "@calcom/lib/test/builder";
import type { CompleteEventType, CompleteUser } from "@calcom/prisma/zod";

import { prismaMock } from "../../../../tests/config/singleton";

const mockFindFirstEventType = (data?: Partial<CompleteEventType>) => {
  const eventType = buildEventType(data as Partial<EventType>);
  prismaMock.eventType.findFirst.mockResolvedValue(eventType as EventType);
  return eventType;
};

jest.mock("@calcom/emails/email-manager", () => {
  return {
    sendSlugReplacementEmail: () => ({}),
  };
});

describe("handleChildrenEventTypes", () => {
  describe("Shortcircuits", () => {
    it("No managed event type", async () => {
      mockFindFirstEventType();
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { users: [] },
        children: [],
        updatedEventType: { schedulingType: null, slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
      });
      expect(result.newUserIds).toEqual(undefined);
      expect(result.oldUserIds).toEqual(undefined);
      expect(result.deletedUserIds).toEqual(undefined);
      expect(result.message).toBe("No managed event type");
    });

    it("No managed event metadata", async () => {
      mockFindFirstEventType();
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { users: [] },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
      });
      expect(result.newUserIds).toEqual(undefined);
      expect(result.oldUserIds).toEqual(undefined);
      expect(result.deletedUserIds).toEqual(undefined);
      expect(result.message).toBe("No managed event metadata");
    });

    it("Missing event type", async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      prismaMock.eventType.findFirst.mockImplementation(() => {
        return new Promise((resolve) => {
          resolve(null);
        });
      });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { users: [] },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
      });
      expect(result.newUserIds).toEqual(undefined);
      expect(result.oldUserIds).toEqual(undefined);
      expect(result.deletedUserIds).toEqual(undefined);
      expect(result.message).toBe("Missing event type");
    });
  });

  describe("Happy paths", () => {
    it("New users added", async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { schedulingType, id, teamId, timeZone, users, ...evType } = mockFindFirstEventType({
        id: 123,
        users: [{ id: 4 } as CompleteUser],
        metadata: { managedEventConfig: {} },
        locations: [],
      });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { users: [] },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
      });
      expect(prismaMock.eventType.create).toHaveBeenCalledWith({
        data: {
          ...evType,
          parentId: 1,
          userId: 4,
          webhooks: undefined,
          workflows: undefined,
        },
      });
      expect(result.newUserIds).toEqual([4]);
      expect(result.oldUserIds).toEqual([]);
      expect(result.deletedUserIds).toEqual([]);
    });

    it("Old users updated", async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { schedulingType, id, teamId, timeZone, users, locations, parentId, userId, ...evType } =
        mockFindFirstEventType({
          users: [{ id: 4 } as CompleteUser],
          metadata: { managedEventConfig: {} },
          locations: [],
        });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { users: [{ id: 4 }] },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
      });
      expect(prismaMock.eventType.update).toHaveBeenCalledWith({
        data: {
          ...evType,
        },
        where: {
          userId_parentId: {
            userId: 4,
            parentId: 1,
          },
        },
      });
      expect(result.newUserIds).toEqual([]);
      expect(result.oldUserIds).toEqual([4]);
      expect(result.deletedUserIds).toEqual([]);
    });

    it("Old users deleted", async () => {
      mockFindFirstEventType({ users: [], metadata: { managedEventConfig: {} }, locations: [] });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { users: [{ id: 4 }] },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
      });
      expect(result.newUserIds).toEqual([]);
      expect(result.oldUserIds).toEqual([]);
      expect(result.deletedUserIds).toEqual([4]);
    });

    it("New, old and deleted users", async () => {
      mockFindFirstEventType({
        users: [{ id: 5 }, { id: 4 }] as CompleteUser[],
        metadata: { managedEventConfig: {} },
        locations: [],
      });
      const result = await updateChildrenEventTypes({
        eventTypeId: 1,
        oldEventType: { users: [{ id: 4 }, { id: 1 }] },
        children: [],
        updatedEventType: { schedulingType: "MANAGED", slug: "something" },
        currentUserId: 1,
        prisma: prismaMock,
      });
      expect(result.newUserIds).toEqual([5]);
      expect(result.oldUserIds).toEqual([4]);
      expect(result.deletedUserIds).toEqual([1]);
    });
  });
});
