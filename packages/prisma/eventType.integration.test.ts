import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";

// Mock Prisma client for integration testing
const prisma = new PrismaClient();

describe("EventType Integration Tests - minimumCancellationNotice", () => {
  let testUserId: number;
  let testTeamId: number;

  beforeEach(async () => {
    // Create test user for each test
    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        username: `testuser-${Date.now()}`,
      },
    });
    testUserId = user.id;

    // Create test team
    const team = await prisma.team.create({
      data: {
        name: `Test Team ${Date.now()}`,
        slug: `test-team-${Date.now()}`,
      },
    });
    testTeamId = team.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.eventType.deleteMany({ where: { userId: testUserId } });
    await prisma.eventType.deleteMany({ where: { teamId: testTeamId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.team.delete({ where: { id: testTeamId } });
  });

  describe("CRUD Operations", () => {
    it("should create an EventType with minimumCancellationNotice", async () => {
      const eventType = await prisma.eventType.create({
        data: {
          title: "30 Min Meeting",
          slug: "30-min-meeting",
          length: 30,
          userId: testUserId,
          minimumCancellationNotice: 1440, // 24 hours
        },
      });

      expect(eventType).toBeDefined();
      expect(eventType.minimumCancellationNotice).toBe(1440);
      expect(eventType.title).toBe("30 Min Meeting");
      expect(eventType.length).toBe(30);
    });

    it("should read EventType with minimumCancellationNotice", async () => {
      const created = await prisma.eventType.create({
        data: {
          title: "Consultation",
          slug: "consultation",
          length: 60,
          userId: testUserId,
          minimumCancellationNotice: 720, // 12 hours
        },
      });

      const fetched = await prisma.eventType.findUnique({
        where: { id: created.id },
      });

      expect(fetched).toBeDefined();
      expect(fetched?.minimumCancellationNotice).toBe(720);
      expect(fetched?.id).toBe(created.id);
    });

    it("should update EventType minimumCancellationNotice", async () => {
      const eventType = await prisma.eventType.create({
        data: {
          title: "Workshop",
          slug: "workshop",
          length: 120,
          userId: testUserId,
          minimumCancellationNotice: 2880, // 48 hours
        },
      });

      const updated = await prisma.eventType.update({
        where: { id: eventType.id },
        data: { minimumCancellationNotice: 4320 }, // 72 hours
      });

      expect(updated.minimumCancellationNotice).toBe(4320);
      
      // Verify persistence
      const fetched = await prisma.eventType.findUnique({
        where: { id: eventType.id },
      });
      expect(fetched?.minimumCancellationNotice).toBe(4320);
    });

    it("should delete EventType with minimumCancellationNotice", async () => {
      const eventType = await prisma.eventType.create({
        data: {
          title: "Temporary Event",
          slug: "temp-event",
          length: 15,
          userId: testUserId,
          minimumCancellationNotice: 60, // 1 hour
        },
      });

      await prisma.eventType.delete({
        where: { id: eventType.id },
      });

      const fetched = await prisma.eventType.findUnique({
        where: { id: eventType.id },
      });

      expect(fetched).toBeNull();
    });
  });

  describe("Bulk Operations", () => {
    it("should handle bulk create with different minimumCancellationNotice values", async () => {
      const eventTypes = await prisma.eventType.createMany({
        data: [
          {
            title: "Quick Call",
            slug: "quick-call-1",
            length: 15,
            userId: testUserId,
            minimumCancellationNotice: 30, // 30 minutes
          },
          {
            title: "Standard Meeting",
            slug: "standard-meeting-1",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 360, // 6 hours
          },
          {
            title: "Long Session",
            slug: "long-session-1",
            length: 90,
            userId: testUserId,
            minimumCancellationNotice: 1440, // 24 hours
          },
        ],
      });

      expect(eventTypes.count).toBe(3);

      const fetchedEventTypes = await prisma.eventType.findMany({
        where: { userId: testUserId },
        orderBy: { length: "asc" },
      });

      expect(fetchedEventTypes).toHaveLength(3);
      expect(fetchedEventTypes[0].minimumCancellationNotice).toBe(30);
      expect(fetchedEventTypes[1].minimumCancellationNotice).toBe(360);
      expect(fetchedEventTypes[2].minimumCancellationNotice).toBe(1440);
    });

    it("should handle bulk update of minimumCancellationNotice", async () => {
      // Create multiple event types
      await prisma.eventType.createMany({
        data: [
          {
            title: "Event 1",
            slug: "event-1-bulk",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 0,
          },
          {
            title: "Event 2",
            slug: "event-2-bulk",
            length: 45,
            userId: testUserId,
            minimumCancellationNotice: 0,
          },
        ],
      });

      // Update all event types for this user
      await prisma.eventType.updateMany({
        where: { userId: testUserId },
        data: { minimumCancellationNotice: 240 }, // 4 hours
      });

      const updatedEvents = await prisma.eventType.findMany({
        where: { userId: testUserId },
      });

      expect(updatedEvents).toHaveLength(2);
      updatedEvents.forEach((event) => {
        expect(event.minimumCancellationNotice).toBe(240);
      });
    });
  });

  describe("Query Filtering", () => {
    it("should filter EventTypes by minimumCancellationNotice value", async () => {
      // Create event types with different cancellation notices
      await prisma.eventType.createMany({
        data: [
          {
            title: "No Notice",
            slug: "no-notice",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 0,
          },
          {
            title: "Short Notice",
            slug: "short-notice",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 60,
          },
          {
            title: "Long Notice",
            slug: "long-notice",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 2880,
          },
        ],
      });

      // Query for events with no cancellation notice
      const noNoticeEvents = await prisma.eventType.findMany({
        where: {
          userId: testUserId,
          minimumCancellationNotice: 0,
        },
      });
      expect(noNoticeEvents).toHaveLength(1);
      expect(noNoticeEvents[0].title).toBe("No Notice");

      // Query for events with cancellation notice > 1 day
      const longNoticeEvents = await prisma.eventType.findMany({
        where: {
          userId: testUserId,
          minimumCancellationNotice: {
            gt: 1440, // Greater than 24 hours
          },
        },
      });
      expect(longNoticeEvents).toHaveLength(1);
      expect(longNoticeEvents[0].title).toBe("Long Notice");

      // Query for events with cancellation notice between 30 mins and 12 hours
      const mediumNoticeEvents = await prisma.eventType.findMany({
        where: {
          userId: testUserId,
          minimumCancellationNotice: {
            gte: 30,
            lte: 720,
          },
        },
      });
      expect(mediumNoticeEvents).toHaveLength(1);
      expect(mediumNoticeEvents[0].title).toBe("Short Notice");
    });

    it("should sort EventTypes by minimumCancellationNotice", async () => {
      await prisma.eventType.createMany({
        data: [
          {
            title: "Medium Notice",
            slug: "medium-sort",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 360,
          },
          {
            title: "No Notice",
            slug: "no-sort",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 0,
          },
          {
            title: "Long Notice",
            slug: "long-sort",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 1440,
          },
        ],
      });

      // Sort ascending
      const ascendingEvents = await prisma.eventType.findMany({
        where: { userId: testUserId },
        orderBy: { minimumCancellationNotice: "asc" },
      });

      expect(ascendingEvents[0].title).toBe("No Notice");
      expect(ascendingEvents[1].title).toBe("Medium Notice");
      expect(ascendingEvents[2].title).toBe("Long Notice");

      // Sort descending
      const descendingEvents = await prisma.eventType.findMany({
        where: { userId: testUserId },
        orderBy: { minimumCancellationNotice: "desc" },
      });

      expect(descendingEvents[0].title).toBe("Long Notice");
      expect(descendingEvents[1].title).toBe("Medium Notice");
      expect(descendingEvents[2].title).toBe("No Notice");
    });
  });

  describe("Relationships and Joins", () => {
    it("should include minimumCancellationNotice when fetching with user relation", async () => {
      await prisma.eventType.create({
        data: {
          title: "User Event",
          slug: "user-event",
          length: 45,
          userId: testUserId,
          minimumCancellationNotice: 180,
        },
      });

      const eventWithUser = await prisma.eventType.findFirst({
        where: { userId: testUserId },
        include: { owner: true },
      });

      expect(eventWithUser).toBeDefined();
      expect(eventWithUser?.minimumCancellationNotice).toBe(180);
      expect(eventWithUser?.owner).toBeDefined();
      expect(eventWithUser?.owner?.id).toBe(testUserId);
    });

    it("should handle team event types with minimumCancellationNotice", async () => {
      const teamEventType = await prisma.eventType.create({
        data: {
          title: "Team Standup",
          slug: "team-standup",
          length: 15,
          teamId: testTeamId,
          minimumCancellationNotice: 60,
        },
      });

      const fetchedTeamEvent = await prisma.eventType.findFirst({
        where: { teamId: testTeamId },
        include: { team: true },
      });

      expect(fetchedTeamEvent).toBeDefined();
      expect(fetchedTeamEvent?.minimumCancellationNotice).toBe(60);
      expect(fetchedTeamEvent?.team).toBeDefined();
      expect(fetchedTeamEvent?.team?.id).toBe(testTeamId);
    });

    it("should handle parent-child event type relationships", async () => {
      const parentEvent = await prisma.eventType.create({
        data: {
          title: "Parent Event Type",
          slug: "parent-event-type",
          length: 60,
          userId: testUserId,
          minimumCancellationNotice: 1440,
        },
      });

      const childEvent = await prisma.eventType.create({
        data: {
          title: "Child Event Type",
          slug: "child-event-type",
          length: 60,
          userId: testUserId,
          parentId: parentEvent.id,
          minimumCancellationNotice: 720, // Different from parent
        },
      });

      const fetchedParent = await prisma.eventType.findUnique({
        where: { id: parentEvent.id },
        include: { children: true },
      });

      expect(fetchedParent?.minimumCancellationNotice).toBe(1440);
      expect(fetchedParent?.children).toHaveLength(1);
      expect(fetchedParent?.children[0].minimumCancellationNotice).toBe(720);

      const fetchedChild = await prisma.eventType.findUnique({
        where: { id: childEvent.id },
        include: { parent: true },
      });

      expect(fetchedChild?.minimumCancellationNotice).toBe(720);
      expect(fetchedChild?.parent?.minimumCancellationNotice).toBe(1440);
    });
  });

  describe("Aggregation Queries", () => {
    it("should calculate average minimumCancellationNotice", async () => {
      await prisma.eventType.createMany({
        data: [
          {
            title: "Event A",
            slug: "event-a-agg",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 60,
          },
          {
            title: "Event B",
            slug: "event-b-agg",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 120,
          },
          {
            title: "Event C",
            slug: "event-c-agg",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 180,
          },
        ],
      });

      const aggregation = await prisma.eventType.aggregate({
        where: { userId: testUserId },
        _avg: { minimumCancellationNotice: true },
        _min: { minimumCancellationNotice: true },
        _max: { minimumCancellationNotice: true },
        _sum: { minimumCancellationNotice: true },
        _count: { minimumCancellationNotice: true },
      });

      expect(aggregation._avg.minimumCancellationNotice).toBe(120);
      expect(aggregation._min.minimumCancellationNotice).toBe(60);
      expect(aggregation._max.minimumCancellationNotice).toBe(180);
      expect(aggregation._sum.minimumCancellationNotice).toBe(360);
      expect(aggregation._count.minimumCancellationNotice).toBe(3);
    });

    it("should group EventTypes by minimumCancellationNotice ranges", async () => {
      await prisma.eventType.createMany({
        data: [
          {
            title: "No Notice 1",
            slug: "no-notice-group-1",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 0,
          },
          {
            title: "No Notice 2",
            slug: "no-notice-group-2",
            length: 45,
            userId: testUserId,
            minimumCancellationNotice: 0,
          },
          {
            title: "Short Notice",
            slug: "short-notice-group",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 60,
          },
          {
            title: "Long Notice",
            slug: "long-notice-group",
            length: 60,
            userId: testUserId,
            minimumCancellationNotice: 1440,
          },
        ],
      });

      const groupedResults = await prisma.eventType.groupBy({
        by: ["minimumCancellationNotice"],
        where: { userId: testUserId },
        _count: { _all: true },
      });

      expect(groupedResults).toHaveLength(3);
      
      const zeroNotice = groupedResults.find(g => g.minimumCancellationNotice === 0);
      expect(zeroNotice?._count._all).toBe(2);
      
      const shortNotice = groupedResults.find(g => g.minimumCancellationNotice === 60);
      expect(shortNotice?._count._all).toBe(1);
      
      const longNotice = groupedResults.find(g => g.minimumCancellationNotice === 1440);
      expect(longNotice?._count._all).toBe(1);
    });
  });

  describe("Transaction Support", () => {
    it("should handle minimumCancellationNotice in transactions", async () => {
      const result = await prisma.$transaction(async (tx) => {
        const event1 = await tx.eventType.create({
          data: {
            title: "Transaction Event 1",
            slug: "tx-event-1",
            length: 30,
            userId: testUserId,
            minimumCancellationNotice: 240,
          },
        });

        const event2 = await tx.eventType.create({
          data: {
            title: "Transaction Event 2",
            slug: "tx-event-2",
            length: 45,
            userId: testUserId,
            minimumCancellationNotice: 480,
          },
        });

        // Update the first event within the transaction
        const updated = await tx.eventType.update({
          where: { id: event1.id },
          data: { minimumCancellationNotice: 360 },
        });

        return { event1: updated, event2 };
      });

      expect(result.event1.minimumCancellationNotice).toBe(360);
      expect(result.event2.minimumCancellationNotice).toBe(480);

      // Verify outside of transaction
      const fetched1 = await prisma.eventType.findUnique({
        where: { id: result.event1.id },
      });
      const fetched2 = await prisma.eventType.findUnique({
        where: { id: result.event2.id },
      });

      expect(fetched1?.minimumCancellationNotice).toBe(360);
      expect(fetched2?.minimumCancellationNotice).toBe(480);
    });

    it("should rollback minimumCancellationNotice changes on transaction failure", async () => {
      let createdId: number | undefined;

      try {
        await prisma.$transaction(async (tx) => {
          const event = await tx.eventType.create({
            data: {
              title: "Rollback Test",
              slug: "rollback-test-tx",
              length: 30,
              userId: testUserId,
              minimumCancellationNotice: 720,
            },
          });
          createdId = event.id;

          // Force an error to rollback the transaction
          throw new Error("Forced rollback");
        });
      } catch (error) {
        // Expected error
      }

      if (createdId) {
        const fetched = await prisma.eventType.findUnique({
          where: { id: createdId },
        });
        expect(fetched).toBeNull(); // Should not exist due to rollback
      }
    });
  });
});