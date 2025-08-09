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

    it("should throw error when selectedCalendar is missing", async () => {
      const data = {} as any;

      await expect(repository.upsert(data)).rejects.toThrow(
        "selectedCalendar is required for CalendarSubscription"
      );
    });

    it("should throw error when selectedCalendar.connect is missing", async () => {
      const data = {
        selectedCalendar: {},
      } as any;

      await expect(repository.upsert(data)).rejects.toThrow(
        "selectedCalendar.connect is required for CalendarSubscription"
      );
    });

    it("should throw error when selectedCalendar.connect.id is missing", async () => {
      const data = {
        selectedCalendar: { connect: {} },
      } as any;

      await expect(repository.upsert(data)).rejects.toThrow(
        "selectedCalendar.connect.id is required for CalendarSubscription"
      );
    });

    it("should throw error when selectedCalendar.connect.id is not a string", async () => {
      const data = {
        selectedCalendar: { connect: { id: 123 } },
      } as any;

      await expect(repository.upsert(data)).rejects.toThrow("selectedCalendar.connect.id must be a string");
    });
  });

  describe("upsertMany", () => {
    it("should create multiple subscriptions", async () => {
      const data = [
        { selectedCalendar: { connect: { id: "selected-calendar-id-1" } } },
        { selectedCalendar: { connect: { id: "selected-calendar-id-2" } } },
      ];

      const result = await repository.upsertMany(data);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ id: expect.any(String) }));
      expect(result[1]).toEqual(expect.objectContaining({ id: expect.any(String) }));
    });

    it("should throw error when any item has invalid selectedCalendar data", async () => {
      const data = [
        { selectedCalendar: { connect: { id: "valid-id" } } },
        { selectedCalendar: { connect: {} } }, // Missing id
      ] as any;

      await expect(repository.upsertMany(data)).rejects.toThrow(
        "selectedCalendar.connect.id is required for CalendarSubscription"
      );
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
        selectedCalendarId: "selected-calendar-id",
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
