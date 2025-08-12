import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarSubscriptionRepository } from "./CalendarSubscriptionRepository";

describe("CalendarSubscriptionRepository", () => {
  let repository: CalendarSubscriptionRepository;

  beforeEach(() => {
    repository = new CalendarSubscriptionRepository(prismock as any);
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

      await prismock.calendarSubscription.create({ data: mockSubscription });

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

  describe("upsertBySelectedCalendarId", () => {
    it("should create new subscription if not exists", async () => {
      const result = await repository.upsertBySelectedCalendarId("selected-calendar-id");

      expect(result).toEqual(
        expect.objectContaining({
          id: expect.any(String),
        })
      );
    });
  });

  describe("upsertManyBySelectedCalendarId", () => {
    it("should create multiple subscriptions", async () => {
      const selectedCalendarIds = ["selected-calendar-id-1", "selected-calendar-id-2"];

      const result = await repository.upsertManyBySelectedCalendarId(selectedCalendarIds);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ id: expect.any(String) }));
      expect(result[1]).toEqual(expect.objectContaining({ id: expect.any(String) }));
    });
  });

  describe("findByChannelId", () => {
    it("should find subscription by channel ID", async () => {
      const mockSubscription = {
        id: "test-id",
        selectedCalendarId: "selected-calendar-id",
        googleChannelId: "test-channel-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prismock.calendarSubscription.create({ data: mockSubscription });

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
        selectedCalendarId: "selected-calendar-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const created = await prismock.calendarSubscription.create({ data: mockSubscription });

      await repository.updateSyncToken(created.id, "new-sync-token");

      const updated = await prismock.calendarSubscription.findUnique({
        where: { id: created.id },
      });

      expect(updated?.nextSyncToken).toBe("new-sync-token");
    });
  });
});
