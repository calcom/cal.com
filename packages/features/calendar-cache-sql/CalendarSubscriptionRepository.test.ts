import prismock from "../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarSubscriptionRepository } from "./CalendarSubscriptionRepository";

describe("CalendarSubscriptionRepository", () => {
  let repository: CalendarSubscriptionRepository;

  beforeEach(async () => {
    await prismock.calendarSubscription.deleteMany();
    repository = new CalendarSubscriptionRepository(prismock as any);
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
        channelId: "test-channel-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prismock.calendarSubscription.create({ data: mockSubscription });

      const result = await repository.findByChannelId("test-channel-id");

      expect(result).toEqual(
        expect.objectContaining({
          channelId: "test-channel-id",
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

      expect(updated?.syncCursor).toBe("new-sync-token");
    });
  });

  describe("updateWatchDetails", () => {
    it("should update watch details with Date channelExpiration", async () => {
      const created = await prismock.calendarSubscription.create({
        data: {
          id: "watch-id",
          selectedCalendarId: "selected-calendar-id",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const expiration = new Date("2030-01-01T00:00:00.000Z");

      await repository.updateWatchDetails(created.id, {
        channelId: "chan-1",
        channelKind: "api#channel",
        channelResourceId: "res-1",
        channelResourceUri: "https://example.com/resource",
        channelExpiration: expiration,
      });

      const updated = await prismock.calendarSubscription.findUnique({ where: { id: created.id } });

      expect(updated?.channelId).toBe("chan-1");
      expect(updated?.channelKind).toBe("api#channel");
      expect(updated?.channelResourceId).toBe("res-1");
      expect(updated?.channelResourceUri).toBe("https://example.com/resource");
      expect(updated?.channelExpiration?.toISOString()).toBe(expiration.toISOString());
    });
  });
});
