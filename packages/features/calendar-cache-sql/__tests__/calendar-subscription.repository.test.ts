import prismock from "../../../../tests/libs/__mocks__/prisma";

import { describe, expect, it, beforeEach } from "vitest";

import { CalendarSubscriptionRepository } from "../calendar-subscription.repository";

describe("CalendarSubscriptionRepository", () => {
  let repository: CalendarSubscriptionRepository;

  beforeEach(() => {
    repository = new CalendarSubscriptionRepository(prismock);
    prismock.calendarSubscription.deleteMany();
  });

  describe("findByUserAndCalendar", () => {
    it("should find subscription by user and calendar", async () => {
      const mockSubscription = {
        id: "test-id",
        userId: 1,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismock.calendarSubscription.create({ data: mockSubscription });

      const result = await repository.findByUserAndCalendar(1, "google_calendar", "test@example.com");

      expect(result).toEqual(
        expect.objectContaining({
          userId: 1,
          integration: "google_calendar",
          externalId: "test@example.com",
        })
      );
    });

    it("should return null if subscription not found", async () => {
      const result = await repository.findByUserAndCalendar(
        999,
        "google_calendar",
        "nonexistent@example.com"
      );
      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("should create new subscription if not exists", async () => {
      const mockSubscription = {
        id: "test-id",
        userId: 1,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: 1,
        delegationCredentialId: null,
        googleChannelId: null,
        googleChannelToken: null,
        googleChannelExpiration: null,
        nextSyncToken: null,
        lastFullSync: null,
        syncErrors: 0,
        maxSyncErrors: 5,
        backoffUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const data = {
        user: { connect: { id: 1 } },
        integration: "google_calendar",
        externalId: "test@example.com",
        credential: { connect: { id: 1 } },
      };

      const result = await repository.upsert(data);

      expect(result).toEqual(
        expect.objectContaining({
          integration: "google_calendar",
          externalId: "test@example.com",
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
