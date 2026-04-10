/**
 * Integration tests for Prisma repository implementations.
 *
 * These tests verify that repository methods build correct Prisma queries
 * by using a mocked PrismaClient. They don't hit a real database — instead
 * they assert that the right Prisma methods are called with the right arguments.
 */
import type { CalendarCredential } from "@calcom/calendar-adapter/calendar-adapter-types";
import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent, SelectedCalendar } from "@calcom/prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { PrismaCalendarCacheEventRepository } from "../repositories/prisma-calendar-cache-event-repository";
import { PrismaCredentialRepository } from "../repositories/prisma-credential-repository";
import { PrismaSelectedCalendarRepository } from "../repositories/prisma-selected-calendar-repository";

// ---------------------------------------------------------------------------
// Mocked PrismaClient factory
// ---------------------------------------------------------------------------

function createMockPrisma() {
  return {
    calendarCacheEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    credential: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: 1 }),
    },
    selectedCalendar: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    $executeRaw: vi.fn().mockResolvedValue(0),
    $transaction: vi.fn().mockImplementation((args: unknown) => {
      if (Array.isArray(args)) return Promise.all(args);
      return (args as () => Promise<unknown>)();
    }),
  } as unknown as PrismaClient;
}

// ---------------------------------------------------------------------------
// PrismaCalendarCacheEventRepository
// ---------------------------------------------------------------------------

describe("PrismaCalendarCacheEventRepository", () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let repo: PrismaCalendarCacheEventRepository;

  beforeEach(() => {
    prisma = createMockPrisma();
    repo = new PrismaCalendarCacheEventRepository(prisma);
  });

  describe("findBusyTimesBetween", () => {
    test("queries with correct calendar IDs and date range", async () => {
      const start = new Date("2026-03-24T00:00:00Z");
      const end = new Date("2026-03-25T00:00:00Z");
      const calendarIds = ["cal-1", "cal-2"];

      await repo.findBusyTimesBetween(calendarIds, start, end);

      expect(prisma.calendarCacheEvent.findMany).toHaveBeenCalledWith({
        where: {
          selectedCalendarId: { in: calendarIds },
          AND: [{ start: { lt: end } }, { end: { gt: start } }],
        },
        select: {
          start: true,
          end: true,
          timeZone: true,
        },
      });
    });

    test("returns results from Prisma", async () => {
      const expected = [
        { start: new Date("2026-03-24T10:00:00Z"), end: new Date("2026-03-24T11:00:00Z"), timeZone: "UTC" },
      ];
      vi.mocked(prisma.calendarCacheEvent.findMany).mockResolvedValue(expected);

      const result = await repo.findBusyTimesBetween(
        ["cal-1"],
        new Date("2026-03-24T00:00:00Z"),
        new Date("2026-03-25T00:00:00Z")
      );

      expect(result).toEqual(expected);
    });
  });

  describe("deleteMany", () => {
    test("deletes events matching the given conditions", async () => {
      const events = [
        { externalId: "ext-1", selectedCalendarId: "cal-1" },
        { externalId: "ext-2", selectedCalendarId: "cal-1" },
      ];

      await repo.deleteMany(events as Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]);

      expect(prisma.calendarCacheEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: events,
        },
      });
    });

    test("skips delete when events list is empty", async () => {
      await repo.deleteMany([]);

      expect(prisma.calendarCacheEvent.deleteMany).not.toHaveBeenCalled();
    });

    test("filters out events missing externalId or selectedCalendarId", async () => {
      const events = [
        { externalId: "", selectedCalendarId: "cal-1" },
        { externalId: "ext-2", selectedCalendarId: "cal-1" },
      ];

      await repo.deleteMany(events as Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]);

      expect(prisma.calendarCacheEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ externalId: "ext-2", selectedCalendarId: "cal-1" }],
        },
      });
    });
  });

  describe("deleteAllBySelectedCalendarId", () => {
    test("deletes all events for a selected calendar", async () => {
      await repo.deleteAllBySelectedCalendarId("cal-1");

      expect(prisma.calendarCacheEvent.deleteMany).toHaveBeenCalledWith({
        where: { selectedCalendarId: "cal-1" },
      });
    });

    test("throws when selectedCalendarId is empty", async () => {
      await expect(repo.deleteAllBySelectedCalendarId("")).rejects.toThrow(
        "selectedCalendarId is required"
      );
    });
  });

  describe("deleteStale", () => {
    test("deletes events with end date in the past", async () => {
      await repo.deleteStale();

      expect(prisma.calendarCacheEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          end: { lte: expect.any(Date) },
        },
      });
    });
  });

  describe("upsertMany", () => {
    test("skips when events array is empty", async () => {
      await repo.upsertMany([]);

      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    });

    test("executes raw SQL for non-empty batches", async () => {
      const events: Partial<CalendarCacheEvent>[] = [
        {
          selectedCalendarId: "cal-1",
          externalId: "ext-1",
          start: new Date("2026-03-24T10:00:00Z"),
          end: new Date("2026-03-24T11:00:00Z"),
        },
      ];

      await repo.upsertMany(events);

      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    test("throws when selectedCalendarId is missing", async () => {
      await expect(
        repo.upsertMany([{ externalId: "ext-1" }])
      ).rejects.toThrow("selectedCalendarId is required");
    });

    test("throws when externalId is missing", async () => {
      await expect(
        repo.upsertMany([{ selectedCalendarId: "cal-1" }])
      ).rejects.toThrow("externalId is required");
    });

    test("throws when start is missing", async () => {
      await expect(
        repo.upsertMany([{ selectedCalendarId: "cal-1", externalId: "ext-1" }])
      ).rejects.toThrow("start is required");
    });

    test("throws when end is missing", async () => {
      await expect(
        repo.upsertMany([
          {
            selectedCalendarId: "cal-1",
            externalId: "ext-1",
            start: new Date("2026-03-24T10:00:00Z"),
          },
        ])
      ).rejects.toThrow("end is required");
    });
  });
});

// ---------------------------------------------------------------------------
// PrismaCredentialRepository
// ---------------------------------------------------------------------------

describe("PrismaCredentialRepository", () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let repo: PrismaCredentialRepository;

  beforeEach(() => {
    prisma = createMockPrisma();
    repo = new PrismaCredentialRepository(prisma);
  });

  function makeSelectedCalendar(overrides: Partial<SelectedCalendar> = {}): SelectedCalendar {
    return {
      id: "sc-1",
      externalId: "ext-1",
      integration: "google_calendar",
      credentialId: 1,
      userId: 1,
      delegationCredentialId: null,
      channelId: null,
      channelResourceId: null,
      channelResourceUri: null,
      channelKind: null,
      channelExpiration: null,
      syncToken: null,
      syncedAt: null,
      syncErrorAt: null,
      syncErrorCount: 0,
      syncSubscribedAt: null,
      syncSubscribedErrorAt: null,
      syncSubscribedErrorCount: 0,
      lastWebhookReceivedAt: null,
      ...overrides,
    } as SelectedCalendar;
  }

  describe("resolve", () => {
    test("resolves credential by credentialId", async () => {
      const credential = { id: 1, type: "google_calendar", key: { access_token: "tok" } };
      vi.mocked(prisma.credential.findUnique).mockResolvedValue(credential as never);

      const result = await repo.resolve(makeSelectedCalendar({ credentialId: 1 }));

      expect(prisma.credential.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, type: true, key: true },
      });
      expect(result.id).toBe(1);
      expect(result.type).toBe("google_calendar");
    });

    test("falls back to delegationCredentialId when credentialId is null", async () => {
      const credential = { id: 10, type: "google_calendar", key: { access_token: "tok" } };
      vi.mocked(prisma.credential.findFirst).mockResolvedValue(credential as never);

      const result = await repo.resolve(
        makeSelectedCalendar({ credentialId: null, delegationCredentialId: "del-1" })
      );

      expect(prisma.credential.findFirst).toHaveBeenCalledWith({
        where: { delegationCredentialId: "del-1" },
        select: { id: true, type: true, key: true },
      });
      expect(result.id).toBe(10);
    });

    test("throws NotFound when neither credentialId nor delegationCredentialId exist", async () => {
      await expect(
        repo.resolve(makeSelectedCalendar({ credentialId: null, delegationCredentialId: null }))
      ).rejects.toThrow("has no credentialId or delegationCredentialId");
    });

    test("throws NotFound when credential does not exist in database", async () => {
      vi.mocked(prisma.credential.findUnique).mockResolvedValue(null);

      await expect(repo.resolve(makeSelectedCalendar({ credentialId: 999 }))).rejects.toThrow(
        "not found"
      );
    });

    test("throws BadRequest for unknown calendar type", async () => {
      vi.mocked(prisma.credential.findUnique).mockResolvedValue({
        id: 1,
        type: "unknown_calendar",
        key: {},
      } as never);

      await expect(repo.resolve(makeSelectedCalendar())).rejects.toThrow("Unknown calendar provider type");
    });
  });

  describe("invalidate", () => {
    test("marks credential as invalid", async () => {
      await repo.invalidate(1);

      expect(prisma.credential.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { invalid: true },
        select: { id: true },
      });
    });
  });
});

// ---------------------------------------------------------------------------
// PrismaSelectedCalendarRepository
// ---------------------------------------------------------------------------

describe("PrismaSelectedCalendarRepository", () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let repo: PrismaSelectedCalendarRepository;

  beforeEach(() => {
    prisma = createMockPrisma();
    repo = new PrismaSelectedCalendarRepository(prisma);
  });

  describe("findById", () => {
    test("queries with correct id and select projection", async () => {
      await repo.findById("sc-1");

      expect(prisma.selectedCalendar.findUnique).toHaveBeenCalledWith({
        where: { id: "sc-1" },
        select: expect.objectContaining({
          id: true,
          externalId: true,
          integration: true,
          credentialId: true,
          delegationCredentialId: true,
          userId: true,
        }),
      });
    });
  });

  describe("findByChannelId", () => {
    test("queries by channelId", async () => {
      await repo.findByChannelId("ch-1");

      expect(prisma.selectedCalendar.findFirst).toHaveBeenCalledWith({
        where: { channelId: "ch-1" },
        select: {
          id: true,
          externalId: true,
          integration: true,
          credentialId: true,
          delegationCredentialId: true,
          channelId: true,
          channelResourceId: true,
          channelExpiration: true,
          syncSubscribedAt: true,
          syncSubscribedErrorCount: true,
          syncToken: true,
          syncedAt: true,
          syncErrorCount: true,
          userId: true,
        },
      });
    });
  });

  describe("updateSyncStatus", () => {
    test("updates with provided sync data", async () => {
      const data = {
        syncToken: "new-token",
        syncedAt: new Date(),
        syncErrorAt: null,
        syncErrorCount: 0,
      };

      await repo.updateSyncStatus("sc-1", data);

      expect(prisma.selectedCalendar.update).toHaveBeenCalledWith({
        where: { id: "sc-1" },
        data,
        select: { id: true },
      });
    });
  });

  describe("updateSubscription", () => {
    test("updates subscription fields", async () => {
      const data = {
        channelId: "ch-new",
        syncSubscribedAt: new Date(),
      };

      await repo.updateSubscription("sc-1", data);

      expect(prisma.selectedCalendar.update).toHaveBeenCalledWith({
        where: { id: "sc-1" },
        data,
        select: { id: true },
      });
    });
  });

  describe("clearUnsubscribeState", () => {
    test("clears channel metadata and sync state in a single transaction", async () => {
      vi.mocked(prisma.selectedCalendar.update).mockResolvedValue({} as never);

      await repo.clearUnsubscribeState("sc-1");

      expect((prisma as unknown as { $transaction: ReturnType<typeof vi.fn> }).$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
      ]);
    });
  });

  describe("updateLastWebhookReceivedAt", () => {
    test("updates lastWebhookReceivedAt to current time", async () => {
      vi.mocked(prisma.selectedCalendar.update).mockResolvedValue({} as never);

      await repo.updateLastWebhookReceivedAt("sc-1");

      expect(prisma.selectedCalendar.update).toHaveBeenCalledWith({
        where: { id: "sc-1" },
        data: { lastWebhookReceivedAt: expect.any(Date) },
        select: { id: true },
      });
    });
  });

  describe("findNextSubscriptionBatch", () => {
    test("queries with integration filter and subscription conditions", async () => {
      await repo.findNextSubscriptionBatch({
        take: 50,
        integrations: ["google_calendar"],
      });

      expect(prisma.selectedCalendar.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            integration: { in: ["google_calendar"] },
          }),
          take: 50,
        })
      );
    });
  });
});
