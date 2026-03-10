/**
 * Integration tests for CalendarCacheEventRepository.
 *
 * These tests run against a real PostgreSQL database to catch constraint
 * violations that unit tests with mocked Prisma clients cannot detect.
 *
 * Prerequisites:
 *   docker-compose -f apps/web/test/docker-compose.yml up -d
 *   DATABASE_URL=postgresql://prisma:prisma@localhost:5433/tests
 *
 * Run:
 *   VITEST_MODE=integration TZ=UTC yarn test packages/features/calendar-subscription
 */

import prisma from "@calcom/prisma";
import type { Credential, SelectedCalendar, User } from "@calcom/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CalendarCacheEventRepository } from "../CalendarCacheEventRepository";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(prefix = "cc") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeEvent(
  selectedCalendarId: string,
  overrides: Partial<{
    id: string;
    externalId: string;
    iCalSequence: number | null;
    isAllDay: boolean | null;
    status: "confirmed" | "tentative" | "cancelled" | null;
  }> = {}
) {
  const externalId = overrides.externalId ?? uid("ext");
  return {
    id: overrides.id ?? uid("id"),
    selectedCalendarId,
    externalId,
    externalEtag: uid("etag"),
    iCalUID: null,
    iCalSequence: overrides.iCalSequence !== undefined ? overrides.iCalSequence : 0,
    summary: "Test Event",
    description: "Test Description",
    location: "Test Location",
    start: new Date("2025-06-01T10:00:00Z"),
    end: new Date("2025-06-01T11:00:00Z"),
    isAllDay: overrides.isAllDay !== undefined ? overrides.isAllDay : false,
    timeZone: "UTC",
    status: (overrides.status !== undefined ? overrides.status : "confirmed") as
      | "confirmed"
      | "tentative"
      | "cancelled",
    recurringEventId: null,
    originalStartTime: null,
    externalCreatedAt: new Date("2025-05-01T09:00:00Z"),
    externalUpdatedAt: new Date("2025-05-01T09:30:00Z"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("CalendarCacheEventRepository (integration)", () => {
  let testUser: User;
  let testCredential: Credential;
  let testSelectedCalendar: SelectedCalendar;
  let repository: CalendarCacheEventRepository;

  beforeAll(async () => {
    repository = new CalendarCacheEventRepository(prisma);

    // Ensure the App row exists for the FK constraint on Credential.appId
    await prisma.$executeRaw`
      INSERT INTO "App" ("slug", "dirName", "categories", "keys", "createdAt", "updatedAt")
      VALUES ('google-calendar', 'googlecalendar', ARRAY['calendar']::"AppCategories"[], '{}', NOW(), NOW())
      ON CONFLICT ("slug") DO NOTHING
    `;

    testUser = await prisma.user.create({
      data: {
        email: `${uid("caltest")}@example.com`,
        username: uid("caltest"),
      },
    });

    testCredential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: { access_token: "test-token" },
        userId: testUser.id,
        appId: "google-calendar",
      },
    });

    testSelectedCalendar = await prisma.selectedCalendar.create({
      data: {
        userId: testUser.id,
        integration: "google_calendar",
        externalId: uid("gcal"),
        credentialId: testCredential.id,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.calendarCacheEvent.deleteMany({
        where: { selectedCalendarId: testSelectedCalendar.id },
      });
      await prisma.selectedCalendar.delete({ where: { id: testSelectedCalendar.id } }).catch(() => {});
      await prisma.credential.delete({ where: { id: testCredential.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    } catch (err) {
      console.warn("Cleanup failed:", err);
    }
  });

  // -------------------------------------------------------------------------
  // upsertMany — basic persistence
  // -------------------------------------------------------------------------

  describe("upsertMany", () => {
    it("inserts a single event and persists it to the database", async () => {
      const event = makeEvent(testSelectedCalendar.id);

      await repository.upsertMany([event]);

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored).not.toBeNull();
      expect(stored?.summary).toBe("Test Event");
      expect(stored?.id).toBeTruthy();
    });

    it("inserts multiple events in a single batch", async () => {
      const events = [
        makeEvent(testSelectedCalendar.id),
        makeEvent(testSelectedCalendar.id),
        makeEvent(testSelectedCalendar.id),
      ];

      await repository.upsertMany(events);

      const stored = await prisma.calendarCacheEvent.findMany({
        where: {
          selectedCalendarId: testSelectedCalendar.id,
          externalId: { in: events.map((e) => e.externalId) },
        },
      });

      expect(stored).toHaveLength(3);
    });

    it("updates an existing event on conflict (ON CONFLICT DO UPDATE)", async () => {
      const event = makeEvent(testSelectedCalendar.id);
      await repository.upsertMany([event]);

      const updated = { ...event, summary: "Updated Summary" };
      await repository.upsertMany([updated]);

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored?.summary).toBe("Updated Summary");
    });

    // -----------------------------------------------------------------------
    // NOT NULL constraint regression tests
    //
    // These tests reproduce the production bugs where $executeRaw bypasses
    // Prisma-level defaults, causing NOT NULL violations when columns that
    // have @default() in schema.prisma receive null/undefined values.
    // -----------------------------------------------------------------------

    it("does NOT throw when id is not provided (regression: NOT NULL on id)", async () => {
      // Simulate a real event coming from CalendarCacheEventService where
      // the id field is absent (undefined), which previously caused:
      // "null value in column id of relation CalendarCacheEvent violates not-null constraint"
      const event = makeEvent(testSelectedCalendar.id);
      // Cast to remove id — simulates objects arriving without the field
      const eventWithoutId = { ...event, id: undefined as unknown as string };

      await expect(repository.upsertMany([eventWithoutId])).resolves.not.toThrow();

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored).not.toBeNull();
      expect(stored?.id).toBeTruthy(); // UUID was generated
    });

    it("does NOT throw when iCalSequence is null (regression: NOT NULL on iCalSequence)", async () => {
      // Previously caused:
      // "null value in column iCalSequence of relation CalendarCacheEvent violates not-null constraint"
      const event = makeEvent(testSelectedCalendar.id, { iCalSequence: null });

      await expect(repository.upsertMany([event])).resolves.not.toThrow();

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored?.iCalSequence).toBe(0); // default applied
    });

    it("does NOT throw when isAllDay is null (regression: NOT NULL on isAllDay)", async () => {
      const event = makeEvent(testSelectedCalendar.id, { isAllDay: null });

      await expect(repository.upsertMany([event])).resolves.not.toThrow();

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored?.isAllDay).toBe(false); // default applied
    });

    it("does NOT throw when status is null (regression: NOT NULL on status)", async () => {
      const event = makeEvent(testSelectedCalendar.id, { status: null });

      await expect(repository.upsertMany([event])).resolves.not.toThrow();

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored?.status).toBe("confirmed"); // default applied
    });

    it("handles all nullable defaults missing simultaneously", async () => {
      const event = makeEvent(testSelectedCalendar.id, {
        id: undefined as unknown as string,
        iCalSequence: null,
        isAllDay: null,
        status: null,
      });

      await expect(repository.upsertMany([event])).resolves.not.toThrow();

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored?.id).toBeTruthy();
      expect(stored?.iCalSequence).toBe(0);
      expect(stored?.isAllDay).toBe(false);
      expect(stored?.status).toBe("confirmed");
    });
  });

  // -------------------------------------------------------------------------
  // findAllBySelectedCalendarIdsBetween
  // -------------------------------------------------------------------------

  describe("findAllBySelectedCalendarIdsBetween", () => {
    it("returns events within the date range", async () => {
      const event = makeEvent(testSelectedCalendar.id);
      await repository.upsertMany([event]);

      const results = await repository.findAllBySelectedCalendarIdsBetween(
        [testSelectedCalendar.id],
        new Date("2025-06-01T09:00:00Z"),
        new Date("2025-06-01T12:00:00Z")
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("start");
      expect(results[0]).toHaveProperty("end");
      expect(results[0]).toHaveProperty("timeZone");
    });

    it("returns no events outside the date range", async () => {
      const results = await repository.findAllBySelectedCalendarIdsBetween(
        [testSelectedCalendar.id],
        new Date("2020-01-01T00:00:00Z"),
        new Date("2020-01-02T00:00:00Z")
      );

      expect(results).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // deleteMany
  // -------------------------------------------------------------------------

  describe("deleteMany", () => {
    it("deletes specified events from the database", async () => {
      const event = makeEvent(testSelectedCalendar.id);
      await repository.upsertMany([event]);

      await repository.deleteMany([
        { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      ]);

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: event.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // deleteAllBySelectedCalendarId
  // -------------------------------------------------------------------------

  describe("deleteAllBySelectedCalendarId", () => {
    it("deletes all events for a given selectedCalendarId", async () => {
      const events = [makeEvent(testSelectedCalendar.id), makeEvent(testSelectedCalendar.id)];
      await repository.upsertMany(events);

      await repository.deleteAllBySelectedCalendarId(testSelectedCalendar.id);

      const remaining = await prisma.calendarCacheEvent.findMany({
        where: { selectedCalendarId: testSelectedCalendar.id },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // deleteStale
  // -------------------------------------------------------------------------

  describe("deleteStale", () => {
    it("deletes events whose end date is in the past", async () => {
      const staleEvent = {
        ...makeEvent(testSelectedCalendar.id),
        start: new Date("2020-01-01T10:00:00Z"),
        end: new Date("2020-01-01T11:00:00Z"),
      };

      await repository.upsertMany([staleEvent]);

      await repository.deleteStale();

      const stored = await prisma.calendarCacheEvent.findFirst({
        where: { externalId: staleEvent.externalId, selectedCalendarId: testSelectedCalendar.id },
      });

      expect(stored).toBeNull();
    });
  });
});
