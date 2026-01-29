import { describe, test, expect, vi, beforeEach } from "vitest";

import { SelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, SelectedCalendar } from "@calcom/prisma/client";

const mockPrismaClient = {
  selectedCalendar: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

const mockSelectedCalendar: SelectedCalendar = {
  id: "test-calendar-id",
  userId: 1,
  credentialId: 1,
  integration: "google_calendar",
  externalId: "test@example.com",
  eventTypeId: null,
  delegationCredentialId: null,
  domainWideDelegationCredentialId: null,
  googleChannelId: null,
  googleChannelKind: null,
  googleChannelResourceId: null,
  googleChannelResourceUri: null,
  googleChannelExpiration: null,
  error: null,
  lastErrorAt: null,
  watchAttempts: 0,
  maxAttempts: 3,
  unwatchAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  channelId: "test-channel-id",
  channelKind: "web_hook",
  channelResourceId: "test-resource-id",
  channelResourceUri: "test-resource-uri",
  channelExpiration: new Date(Date.now() + 86400000),
  syncSubscribedAt: new Date(),
  syncSubscribedErrorAt: null,
  syncSubscribedErrorCount: 0,
  syncToken: "test-sync-token",
  syncedAt: new Date(),
  syncErrorAt: null,
  syncErrorCount: 0,
};

describe("SelectedCalendarRepository", () => {
  let repository: SelectedCalendarRepository;

  beforeEach(() => {
    repository = new SelectedCalendarRepository(mockPrismaClient);
    vi.clearAllMocks();
  });

  describe("findById", () => {
    test("should find selected calendar by id with credential delegation", async () => {
      const mockCalendarWithCredential = {
        ...mockSelectedCalendar,
        credential: {
          delegationCredential: {
            id: "delegation-id",
            key: { client_email: "test@service.com" },
          },
        },
      };

      vi.mocked(mockPrismaClient.selectedCalendar.findUnique).mockResolvedValue(mockCalendarWithCredential);

      const result = await repository.findById("test-calendar-id");

      expect(mockPrismaClient.selectedCalendar.findUnique).toHaveBeenCalledWith({
        where: { id: "test-calendar-id" },
      });

      expect(result).toEqual(mockCalendarWithCredential);
    });

    test("should return null when calendar not found", async () => {
      vi.mocked(mockPrismaClient.selectedCalendar.findUnique).mockResolvedValue(null);

      const result = await repository.findById("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("findByChannelId", () => {
    test("should find selected calendar by channel id", async () => {
      vi.mocked(mockPrismaClient.selectedCalendar.findFirst).mockResolvedValue(mockSelectedCalendar);

      const result = await repository.findByChannelId("test-channel-id");

      expect(mockPrismaClient.selectedCalendar.findFirst).toHaveBeenCalledWith({
        where: { channelId: "test-channel-id" },
      });

      expect(result).toEqual(mockSelectedCalendar);
    });

    test("should return null when calendar not found", async () => {
      vi.mocked(mockPrismaClient.selectedCalendar.findFirst).mockResolvedValue(null);

      const result = await repository.findByChannelId("non-existent-channel-id");

      expect(result).toBeNull();
    });
  });

  describe("findNextSubscriptionBatch", () => {
    test("should find next batch of calendars for subscription", async () => {
      const mockCalendars = [mockSelectedCalendar];
      vi.mocked(mockPrismaClient.selectedCalendar.findMany).mockResolvedValue(mockCalendars);

      const result = await repository.findNextSubscriptionBatch({
        take: 10,
        featureIds: ["calendar-subscription-cache"],
        integrations: ["google_calendar", "office365_calendar"],
      });

      expect(mockPrismaClient.selectedCalendar.findMany).toHaveBeenCalledWith({
        where: {
          integration: { in: ["google_calendar", "office365_calendar"] },
          user: {
            teams: {
              some: {
                accepted: true,
                team: {
                  features: {
                    some: {
                      featureId: { in: ["calendar-subscription-cache"] },
                      enabled: true,
                    },
                  },
                },
              },
            },
          },
          AND: [
            {
              OR: [
                { syncSubscribedAt: null },
                { channelExpiration: null },
                { channelExpiration: { lte: expect.any(Date) } },
              ],
            },
            {
              OR: [
                { syncSubscribedErrorAt: null },
                { syncSubscribedErrorAt: { lt: expect.any(Date) } },
              ],
            },
            {
              syncSubscribedErrorCount: { lt: 3 },
            },
          ],
        },
        take: 10,
      });

      expect(result).toEqual(mockCalendars);
    });

    test("should handle empty integrations array", async () => {
      const mockCalendars = [mockSelectedCalendar];
      vi.mocked(mockPrismaClient.selectedCalendar.findMany).mockResolvedValue(mockCalendars);

      const result = await repository.findNextSubscriptionBatch({
        take: 5,
        featureIds: ["calendar-subscription-cache"],
        integrations: [],
      });

      expect(mockPrismaClient.selectedCalendar.findMany).toHaveBeenCalledWith({
        where: {
          integration: { in: [] },
          user: {
            teams: {
              some: {
                accepted: true,
                team: {
                  features: {
                    some: {
                      featureId: { in: ["calendar-subscription-cache"] },
                      enabled: true,
                    },
                  },
                },
              },
            },
          },
          AND: [
            {
              OR: [
                { syncSubscribedAt: null },
                { channelExpiration: null },
                { channelExpiration: { lte: expect.any(Date) } },
              ],
            },
            {
              OR: [
                { syncSubscribedErrorAt: null },
                { syncSubscribedErrorAt: { lt: expect.any(Date) } },
              ],
            },
            {
              syncSubscribedErrorCount: { lt: 3 },
            },
          ],
        },
        take: 5,
      });

      expect(result).toEqual(mockCalendars);
    });

    test("should filter out generic calendars when genericCalendarSuffixes is provided", async () => {
      const mockCalendars = [mockSelectedCalendar];
      vi.mocked(mockPrismaClient.selectedCalendar.findMany).mockResolvedValue(mockCalendars);

      const genericSuffixes = ["@group.v.calendar.google.com", "@group.calendar.google.com"];

      const result = await repository.findNextSubscriptionBatch({
        take: 10,
        featureIds: ["calendar-subscription-cache"],
        integrations: ["google_calendar"],
        genericCalendarSuffixes: genericSuffixes,
      });

      expect(mockPrismaClient.selectedCalendar.findMany).toHaveBeenCalledWith({
        where: {
          integration: { in: ["google_calendar"] },
          user: {
            teams: {
              some: {
                accepted: true,
                team: {
                  features: {
                    some: {
                      featureId: { in: ["calendar-subscription-cache"] },
                      enabled: true,
                    },
                  },
                },
              },
            },
          },
          AND: [
            {
              OR: [
                { syncSubscribedAt: null },
                { channelExpiration: null },
                { channelExpiration: { lte: expect.any(Date) } },
              ],
            },
            {
              OR: [
                { syncSubscribedErrorAt: null },
                { syncSubscribedErrorAt: { lt: expect.any(Date) } },
              ],
            },
            {
              syncSubscribedErrorCount: { lt: 3 },
            },
            { NOT: { externalId: { endsWith: "@group.v.calendar.google.com" } } },
            { NOT: { externalId: { endsWith: "@group.calendar.google.com" } } },
          ],
        },
        take: 10,
      });

      expect(result).toEqual(mockCalendars);
    });
  });

  describe("updateSyncStatus", () => {
    test("should update sync status", async () => {
      const updateData: Pick<
        Prisma.SelectedCalendarUpdateInput,
        "syncToken" | "syncedAt" | "syncErrorAt" | "syncErrorCount"
      > = {
        syncToken: "new-sync-token",
        syncedAt: new Date(),
        syncErrorAt: null,
        syncErrorCount: 0,
      };

      const updatedCalendar = {
        ...mockSelectedCalendar,
        ...updateData,
      };

      vi.mocked(mockPrismaClient.selectedCalendar.update).mockResolvedValue(updatedCalendar);

      const result = await repository.updateSyncStatus("test-calendar-id", updateData);

      expect(mockPrismaClient.selectedCalendar.update).toHaveBeenCalledWith({
        where: { id: "test-calendar-id" },
        data: updateData,
      });

      expect(result).toEqual(updatedCalendar);
    });

    test("should update sync error status", async () => {
      const updateData: Pick<
        Prisma.SelectedCalendarUpdateInput,
        "syncToken" | "syncedAt" | "syncErrorAt" | "syncErrorCount"
      > = {
        syncErrorAt: new Date(),
        syncErrorCount: 1,
      };

      const updatedCalendar = {
        ...mockSelectedCalendar,
        ...updateData,
      };

      vi.mocked(mockPrismaClient.selectedCalendar.update).mockResolvedValue(updatedCalendar);

      const result = await repository.updateSyncStatus("test-calendar-id", updateData);

      expect(mockPrismaClient.selectedCalendar.update).toHaveBeenCalledWith({
        where: { id: "test-calendar-id" },
        data: updateData,
      });

      expect(result).toEqual(updatedCalendar);
    });
  });

  describe("updateSubscription", () => {
    test("should update subscription status", async () => {
      const updateData: Pick<
        Prisma.SelectedCalendarUpdateInput,
        | "channelId"
        | "channelResourceId"
        | "channelResourceUri"
        | "channelKind"
        | "channelExpiration"
        | "syncSubscribedAt"
      > = {
        channelId: "new-channel-id",
        channelResourceId: "new-resource-id",
        channelResourceUri: "new-resource-uri",
        channelKind: "web_hook",
        channelExpiration: new Date(Date.now() + 86400000),
        syncSubscribedAt: new Date(),
      };

      const updatedCalendar = {
        ...mockSelectedCalendar,
        ...updateData,
      };

      vi.mocked(mockPrismaClient.selectedCalendar.update).mockResolvedValue(updatedCalendar);

      const result = await repository.updateSubscription("test-calendar-id", updateData);

      expect(mockPrismaClient.selectedCalendar.update).toHaveBeenCalledWith({
        where: { id: "test-calendar-id" },
        data: updateData,
      });

      expect(result).toEqual(updatedCalendar);
    });

    test("should unsubscribe by setting syncSubscribedAt to null", async () => {
      const updateData: Pick<
        Prisma.SelectedCalendarUpdateInput,
        | "channelId"
        | "channelResourceId"
        | "channelResourceUri"
        | "channelKind"
        | "channelExpiration"
        | "syncSubscribedAt"
      > = {
        syncSubscribedAt: null,
      };

      const updatedCalendar = {
        ...mockSelectedCalendar,
        syncSubscribedAt: null,
      };

      vi.mocked(mockPrismaClient.selectedCalendar.update).mockResolvedValue(updatedCalendar);

      const result = await repository.updateSubscription("test-calendar-id", updateData);

      expect(mockPrismaClient.selectedCalendar.update).toHaveBeenCalledWith({
        where: { id: "test-calendar-id" },
        data: updateData,
      });

      expect(result).toEqual(updatedCalendar);
    });
  });
});
