import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarSubscriptionRepository } from "../calendar-subscription.repository";

describe("CalendarSubscriptionRepository", () => {
  let repository: CalendarSubscriptionRepository;

  beforeEach(() => {
    repository = new CalendarSubscriptionRepository(prismock);
    prismock.calendarSubscription.deleteMany();
  });

  describe("findBySelectedCalendar", () => {
    it("should find subscription by selected calendar ID", async () => {
      const mockSubscription = {
        id: "test-id",
        selectedCalendarId: "selected-calendar-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarSubscription.create({ data: mockSubscription });

      const result = await repository.findBySelectedCalendar("selected-calendar-id");

      expect(result).toEqual(
        expect.objectContaining({
          selectedCalendarId: "selected-calendar-id",
        })
      );
    });

    it("should return null if subscription not found", async () => {
      const result = await repository.findBySelectedCalendar("nonexistent-calendar-id");
      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("should create new subscription if not exists", async () => {
      const data = {
        selectedCalendar: { connect: { id: "selected-calendar-id" } },
      };

      const result = await repository.upsert(data);

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
        })
      );
    });
  });

  describe("findByChannelId", () => {
    it("should find subscription by channel ID", async () => {
      const mockSubscription = {
        id: "test-id",
        userId: 1,
        integration: "google_calendar",
        externalId: "test@example.com",
        googleChannelId: "test-channel-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarSubscription.create({ data: mockSubscription });

      const result = await repository.findByChannelId("test-channel-id");

      expect(result).toEqual(
        expect.objectContaining({
          googleChannelId: "test-channel-id",
        })
      );
    });
  });

  describe("updateSyncToken", () => {
    it("should update sync token", async () => {
      const mockSubscription = {
        id: "test-id",
        userId: 1,
        integration: "google_calendar",
        externalId: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const created = prismock.calendarSubscription.create({ data: mockSubscription });

      await repository.updateSyncToken(created.id, "new-sync-token");

      const updated = await prismock.calendarSubscription.findUnique({
        where: { id: created.id },
      });

      expect(updated?.nextSyncToken).toBe("new-sync-token");
    });
  });
});
