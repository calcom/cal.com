import prisma from "@calcom/prisma";
import type { EventType, Team, User } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getHostsForAvailabilityHandler } from "./getHostsForAvailability.handler";
import { getHostsForAssignmentHandler } from "./getHostsForAssignment.handler";

let user1: User;
let user2: User;
let user3: User;
let team: Team;
let eventType: EventType;

describe("getHostsForAvailability and getHostsForAssignment", () => {
  beforeAll(async () => {
    const timestamp = Date.now();

    user1 = await prisma.user.create({
      data: {
        username: `host-test-1-${timestamp}`,
        email: `host-test-1-${timestamp}@example.com`,
        name: "Host User 1",
      },
    });
    user2 = await prisma.user.create({
      data: {
        username: `host-test-2-${timestamp}`,
        email: `host-test-2-${timestamp}@example.com`,
        name: "Host User 2",
      },
    });
    user3 = await prisma.user.create({
      data: {
        username: `host-test-3-${timestamp}`,
        email: `host-test-3-${timestamp}@example.com`,
        name: "Host User 3",
      },
    });

    team = await prisma.team.create({
      data: {
        name: `Host Test Team ${timestamp}`,
        slug: `host-test-team-${timestamp}`,
        members: {
          createMany: {
            data: [
              { userId: user1.id, role: MembershipRole.ADMIN, accepted: true },
              { userId: user2.id, role: MembershipRole.MEMBER, accepted: true },
              { userId: user3.id, role: MembershipRole.MEMBER, accepted: true },
            ],
          },
        },
      },
    });

    eventType = await prisma.eventType.create({
      data: {
        title: "Host Test Event",
        slug: `host-test-event-${timestamp}`,
        length: 30,
        teamId: team.id,
        schedulingType: SchedulingType.ROUND_ROBIN,
        hosts: {
          createMany: {
            data: [
              { userId: user1.id, isFixed: true, priority: 1, weight: 100 },
              { userId: user2.id, isFixed: false, priority: 2, weight: 200 },
              { userId: user3.id, isFixed: false, priority: 3, weight: 50 },
            ],
          },
        },
      },
    });
  });

  afterAll(async () => {
    try {
      if (eventType?.id) {
        await prisma.host.deleteMany({ where: { eventTypeId: eventType.id } });
        await prisma.eventType.delete({ where: { id: eventType.id } });
      }
      if (team?.id) {
        await prisma.team.delete({ where: { id: team.id } });
      }
      const userIds = [user1?.id, user2?.id, user3?.id].filter(Boolean);
      if (userIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  describe("getHostsForAvailability", () => {
    it("should return all hosts for an event type", async () => {
      const result = await getHostsForAvailabilityHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 10 },
      });

      expect(result.hosts).toHaveLength(3);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();

      const userIds = result.hosts.map((h) => h.userId);
      expect(userIds).toContain(user1.id);
      expect(userIds).toContain(user2.id);
      expect(userIds).toContain(user3.id);
    });

    it("should paginate hosts correctly", async () => {
      const page1 = await getHostsForAvailabilityHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 2 },
      });

      expect(page1.hosts).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await getHostsForAvailabilityHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: page1.nextCursor ?? null, limit: 2 },
      });

      expect(page2.hosts).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
      expect(page2.nextCursor).toBeUndefined();

      // No duplicate hosts across pages
      const allUserIds = [...page1.hosts.map((h) => h.userId), ...page2.hosts.map((h) => h.userId)];
      expect(new Set(allUserIds).size).toBe(3);
    });

    it("should return host data with user fields", async () => {
      const result = await getHostsForAvailabilityHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 10 },
      });

      const host1 = result.hosts.find((h) => h.userId === user1.id);
      expect(host1).toBeDefined();
      expect(host1?.isFixed).toBe(true);
      expect(host1?.priority).toBe(1);
      expect(host1?.weight).toBe(100);
      expect(host1?.name).toBe("Host User 1");
    });

    it("should filter hosts by search term", async () => {
      const result = await getHostsForAvailabilityHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 10, search: "Host User 1" },
      });

      expect(result.hosts).toHaveLength(1);
      expect(result.hosts[0].userId).toBe(user1.id);
    });
  });

  describe("getHostsForAssignment", () => {
    it("should return all hosts for an event type", async () => {
      const result = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 10 },
      });

      expect(result.hosts).toHaveLength(3);
      expect(result.hasMore).toBe(false);

      const userIds = result.hosts.map((h) => h.userId);
      expect(userIds).toContain(user1.id);
      expect(userIds).toContain(user2.id);
      expect(userIds).toContain(user3.id);
    });

    it("should paginate hosts correctly", async () => {
      const page1 = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 1 },
      });

      expect(page1.hosts).toHaveLength(1);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      // hasFixedHosts should be present on first page
      expect(page1.hasFixedHosts).toBe(true);

      const page2 = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: page1.nextCursor ?? null, limit: 1 },
      });

      expect(page2.hosts).toHaveLength(1);
      expect(page2.hasMore).toBe(true);

      // hasFixedHosts should NOT be present on subsequent pages
      expect(page2.hasFixedHosts).toBeUndefined();

      const page3 = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: page2.nextCursor ?? null, limit: 1 },
      });

      expect(page3.hosts).toHaveLength(1);
      expect(page3.hasMore).toBe(false);
    });

    it("should include email in assignment host data", async () => {
      const result = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 10 },
      });

      const host1 = result.hosts.find((h) => h.userId === user1.id);
      expect(host1).toBeDefined();
      expect(host1?.email).toContain("host-test-1");
      expect(host1?.name).toBe("Host User 1");
    });

    it("should filter by memberUserIds when provided", async () => {
      const result = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: {
          eventTypeId: eventType.id,
          cursor: null,
          limit: 10,
          memberUserIds: [user1.id, user2.id],
        },
      });

      expect(result.hosts).toHaveLength(2);
      const userIds = result.hosts.map((h) => h.userId);
      expect(userIds).toContain(user1.id);
      expect(userIds).toContain(user2.id);
      expect(userIds).not.toContain(user3.id);
    });

    it("should return zero results for empty memberUserIds array", async () => {
      const result = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: {
          eventTypeId: eventType.id,
          cursor: null,
          limit: 10,
          memberUserIds: [],
        },
      });

      expect(result.hosts).toHaveLength(0);
    });

    it("should filter hosts by search term", async () => {
      const result = await getHostsForAssignmentHandler({
        ctx: { user: { id: user1.id } as never, prisma },
        input: { eventTypeId: eventType.id, cursor: null, limit: 10, search: "Host User 2" },
      });

      expect(result.hosts).toHaveLength(1);
      expect(result.hosts[0].userId).toBe(user2.id);
    });
  });
});
