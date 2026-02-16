import prismock from "@calcom/testing/lib/__mocks__/prisma";
import type { FeatureId } from "@calcom/features/flags/config";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { SelectedCalendarRepository } from "@calcom/features/selectedCalendar/repositories/SelectedCalendarRepository";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";
import type { Prisma, SelectedCalendar } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, test, vi, it } from "vitest";

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
        teamIds: [1, 2, 3],
        integrations: ["google_calendar", "office365_calendar"],
      });

      expect(mockPrismaClient.selectedCalendar.findMany).toHaveBeenCalledWith({
        where: {
          integration: { in: ["google_calendar", "office365_calendar"] },
          user: {
            teams: {
              some: {
                accepted: true,
                teamId: { in: [1, 2, 3] },
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
              OR: [{ syncSubscribedErrorAt: null }, { syncSubscribedErrorAt: { lt: expect.any(Date) } }],
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
        teamIds: [1, 2, 3],
        integrations: [],
      });

      expect(mockPrismaClient.selectedCalendar.findMany).toHaveBeenCalledWith({
        where: {
          integration: { in: [] },
          user: {
            teams: {
              some: {
                accepted: true,
                teamId: { in: [1, 2, 3] },
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
              OR: [{ syncSubscribedErrorAt: null }, { syncSubscribedErrorAt: { lt: expect.any(Date) } }],
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
        teamIds: [1, 2, 3],
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
                teamId: { in: [1, 2, 3] },
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
              OR: [{ syncSubscribedErrorAt: null }, { syncSubscribedErrorAt: { lt: expect.any(Date) } }],
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

  describe("Static Methods", () => {
    beforeEach(() => {
      prismock.selectedCalendar.deleteMany();
    });

    describe("getNextBatchToWatch", () => {
      it("excludes calendars when calendar-cache feature is disabled on a team", async () => {
        const user = await prisma.user.create({
          data: {
            email: "calendar-cache-disabled@example.com",
            username: "calendar-cache-disabled",
          },
        });

        const team = await prisma.team.create({
          data: {
            name: "Calendar Cache Disabled Team",
            slug: "calendar-cache-disabled-team",
          },
        });

        await prisma.membership.create({
          data: {
            userId: user.id,
            teamId: team.id,
            role: MembershipRole.ADMIN,
            accepted: true,
          },
        });

        const featuresRepository = new FeaturesRepository(prismock);
        await featuresRepository.setTeamFeatureState({
          teamId: team.id,
          featureId: "calendar-cache" as FeatureId,
          state: "disabled",
          assignedBy: "test",
        });

        await prisma.selectedCalendar.create({
          data: {
            userId: user.id,
            integration: "google_calendar",
            externalId: "disabled@example.com",
            credentialId: 1,
          },
        });

        const nextBatch = await SelectedCalendarRepository.getNextBatchToWatch();

        expect(nextBatch).toEqual([]);
      });
    });

    describe("create", () => {
      it("should create a selected calendar", async () => {
        const data = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
        };

        const result = await SelectedCalendarRepository.create(data);

        expect(result).toEqual(expect.objectContaining(data));
      });

      it("should throw error if we try to create a user-level calendar with same userId_integration_externalId as an existing user-level calendar", async () => {
        const data = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId: null,
        };

        await SelectedCalendarRepository.create(data);

        await expect(
          SelectedCalendarRepository.create({
            ...data,
            credentialId: 2,
          })
        ).rejects.toThrow("Selected calendar already exists");
      });

      it("should allow creating a user-level calendar with same userId_integration_externalId as an existing event-type level calendar", async () => {
        const data = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId: 1,
        };

        await SelectedCalendarRepository.create(data);

        const userLevelCalendarData = {
          ...data,
          eventTypeId: null,
        };
        const created = await SelectedCalendarRepository.create(userLevelCalendarData);

        expect(created).toEqual(expect.objectContaining(userLevelCalendarData));
      });
    });

    describe("update", () => {
      it("should update a selected calendar and return it", async () => {
        const calendarToUpdate = await SelectedCalendarRepository.create({
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
        });

        const updatedCalendar = await SelectedCalendarRepository.update({
          where: { userId: 1, externalId: "test@gmail.com" },
          data: { integration: "office365_calendar" },
        });

        expect(updatedCalendar.id).toBe(calendarToUpdate.id);
        expect(updatedCalendar.integration).toBe("office365_calendar");
      });

      it("should throw error when trying to update multiple calendars", async () => {
        await SelectedCalendarRepository.create({
          userId: 1,
          integration: "google_calendar",
          externalId: "test1@gmail.com",
          credentialId: 1,
        });

        await SelectedCalendarRepository.create({
          userId: 1,
          integration: "google_calendar2",
          externalId: "test1@gmail.com",
          credentialId: 2,
        });

        await expect(
          SelectedCalendarRepository.update({
            where: { userId: 1, externalId: "test1@gmail.com" },
            data: { integration: "office365_calendar" },
          })
        ).rejects.toThrow(
          "Multiple SelectedCalendar records found to update. updateMany should be used instead"
        );
      });
    });

    describe("delete", () => {
      it("should delete a selected calendar and return it", async () => {
        const calendar = await SelectedCalendarRepository.create({
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
        });

        const deleted = await SelectedCalendarRepository.delete({
          where: {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
          },
        });

        expect(deleted).toEqual(calendar);
        const result = await SelectedCalendarRepository.findFirst({
          where: { id: calendar.id },
        });

        expect(result).toBeNull();
      });

      it("should throw error when trying to delete non-existent calendar", async () => {
        await expect(
          SelectedCalendarRepository.delete({
            where: {
              userId: 999,
              integration: "google_calendar",
              externalId: "nonexistent@gmail.com",
              credentialId: 999,
            },
          })
        ).rejects.toThrow("SelectedCalendar not found");
      });
    });

    describe("findUserLevelUniqueOrThrow", () => {
      it("should find user level calendar", async () => {
        const calendar = await SelectedCalendarRepository.create({
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId: null,
        });

        const result = await SelectedCalendarRepository.findUserLevelUniqueOrThrow({
          where: { userId: 1, externalId: "test@gmail.com" },
        });

        expect(result).toEqual(
          expect.objectContaining({
            userId: calendar.userId,
            externalId: calendar.externalId,
          })
        );
      });

      it("should not find event type level calendar", async () => {
        await SelectedCalendarRepository.create({
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          credentialId: 1,
          eventTypeId: 1,
        });

        await expect(
          SelectedCalendarRepository.findUserLevelUniqueOrThrow({
            where: { userId: 1, externalId: "test@gmail.com" },
          })
        ).rejects.toThrow("SelectedCalendar not found");
      });
    });

    describe("upsert", () => {
      describe("User Level Calendar", () => {
        const eventTypeId = null;
        it("should update existing calendar as long as a record with same userId_integration_externalId is present for eventTypeId=null", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
            eventTypeId,
          };

          const existingCalendar = await SelectedCalendarRepository.create(initialData);

          const updatedData = {
            ...initialData,
            credentialId: 2,
            eventTypeId,
          };

          const result = await SelectedCalendarRepository.upsert(updatedData);

          expect(result.credentialId).toBe(2);
          expect(existingCalendar.id).toBe(result.id);
        });

        it("should create new calendar if no record with same userId_integration_externalId is present when eventTypeId=null", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
            eventTypeId,
          };

          const existingCalendar = await SelectedCalendarRepository.create(initialData);

          const updatedData = {
            ...initialData,
            externalId: "test2@gmail.com",
            credentialId: 2,
            eventTypeId,
          };

          const result = await SelectedCalendarRepository.upsert(updatedData);
          expect(await prisma.selectedCalendar.count()).toBe(2);
          expect(result).toEqual(expect.objectContaining(updatedData));
          expect(existingCalendar.id).not.toBe(result.id);
        });
      });

      describe("Event Type Level Calendar", () => {
        const eventTypeId = 101;
        it("should update existing calendar as long as record with same userId_integration_externalId_eventTypeId is present", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
            eventTypeId,
          };

          const existingCalendar = await SelectedCalendarRepository.create(initialData);

          const updatedData = {
            ...initialData,
            credentialId: 2,
            eventTypeId,
          };

          const result = await SelectedCalendarRepository.upsert(updatedData);

          expect(result.credentialId).toBe(2);
          expect(existingCalendar.id).toBe(result.id);
        });

        it("should create new calendar if no record with same userId_integration_externalId_eventTypeId is present", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
            eventTypeId,
          };

          const existingCalendar = await SelectedCalendarRepository.create(initialData);

          const updatedData = {
            ...initialData,
            credentialId: 2,
            externalId: "test2@gmail.com",
            eventTypeId,
          };

          const result = await SelectedCalendarRepository.upsert(updatedData);
          expect(await prisma.selectedCalendar.count()).toBe(2);
          expect(result).toEqual(expect.objectContaining(updatedData));
          expect(existingCalendar.id).not.toBe(result.id);
        });
      });
    });

    describe("Delegation Credential", () => {
      it("should create a selected calendar with delegationCredentialId", async () => {
        const data = {
          userId: 1,
          integration: "google_calendar",
          externalId: "test@gmail.com",
          delegationCredentialId: "delegationCredential-123",
        };

        const result = await SelectedCalendarRepository.create(data);

        expect(result).toEqual(expect.objectContaining(data));
      });

      describe("upsert", () => {
        describe("updation", () => {
          it("should update existing record with delegationCredentialId if credentialId is -1", async () => {
            const initialData = {
              userId: 1,
              integration: "google_calendar",
              externalId: "test@gmail.com",
              credentialId: 1,
              eventTypeId: null,
            };

            const existingCalendar = await SelectedCalendarRepository.create(initialData);

            const data = {
              userId: 1,
              integration: "google_calendar",
              externalId: "test@gmail.com",
              credentialId: -1,
              delegationCredentialId: "delegationCredential-123",
            };

            const result = await SelectedCalendarRepository.upsert(data);
            expect(result.id).not.toBe(null);
            expect(result.id).toBe(existingCalendar.id);
            expect(result.credentialId).toBe(null);
            expect(result.delegationCredentialId).toBe(data.delegationCredentialId);
          });

          it("should update existing record with credentialId if credentialId is valid(>0) even if delegationCredentialId is set", async () => {
            const initialData = {
              userId: 1,
              integration: "google_calendar",
              externalId: "test@gmail.com",
              credentialId: 1,
              eventTypeId: null,
            };

            const existingCalendar = await SelectedCalendarRepository.create(initialData);

            const data = {
              userId: 1,
              integration: "google_calendar",
              externalId: "test@gmail.com",
              credentialId: 2,
              delegationCredentialId: "delegationCredential-123",
            };
            const beforeDelegationCredentialId = data.delegationCredentialId;

            const result = await SelectedCalendarRepository.upsert(data);
            expect(result.id).not.toBe(null);
            expect(result.id).toBe(existingCalendar.id);
            expect(result.credentialId).toBe(data.credentialId);
            expect(result.delegationCredentialId).toBe(beforeDelegationCredentialId);
          });
        });

        describe("creation", () => {
          it("should create a new record with delegationCredentialId if credentialId is -1", async () => {
            const initialData = {
              userId: 1,
              integration: "google_calendar",
              externalId: "test@gmail.com",
              credentialId: 1,
              eventTypeId: null,
            };

            const existingCalendar = await SelectedCalendarRepository.create(initialData);

            const data = {
              userId: 1,
              integration: "google_calendar",
              externalId: "anotheremail@gmail.com",
              credentialId: -1,
              delegationCredentialId: "delegationCredential-123",
            };

            const result = await SelectedCalendarRepository.upsert(data);
            expect(result.id).not.toBe(null);
            expect(result.id).not.toBe(existingCalendar.id);
            expect(result.credentialId).toBe(null);
            expect(result.delegationCredentialId).toBe(data.delegationCredentialId);
          });
        });

        it("shouldnt update existing delegationCredentialId if upsert data doesn't have it", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            eventTypeId: null,
            delegationCredentialId: "delegationCredential-123",
            credentialId: 1,
          };

          const beforeDelegationCredentialId = initialData.delegationCredentialId;
          const existingCalendar = await SelectedCalendarRepository.create(initialData);

          const data = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            credentialId: 1,
          };

          const result = await SelectedCalendarRepository.upsert(data);
          expect(result.id).toBe(existingCalendar.id);
          expect(result.credentialId).toBe(existingCalendar.credentialId);
          expect(result.delegationCredentialId).toBe(beforeDelegationCredentialId);
        });

        it("shouldnt update delegationCredentialId if it is undefined", async () => {
          const initialData = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
            eventTypeId: null,
            delegationCredentialId: "delegationCredential-123",
          };

          const existingCalendar = await SelectedCalendarRepository.create(initialData);

          const data = {
            userId: 1,
            integration: "google_calendar",
            externalId: "test@gmail.com",
          };

          const result = await SelectedCalendarRepository.upsert(data);
          expect(result.id).toBe(existingCalendar.id);
          expect(result.credentialId).toBe(existingCalendar.credentialId);
          expect(result.delegationCredentialId).toBe(existingCalendar.delegationCredentialId);
        });
      });
    });
  });
});
