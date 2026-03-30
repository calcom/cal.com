import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { getCalendarCredentials } from "@calcom/features/calendars/lib/CalendarManager";
import { prisma } from "@calcom/prisma";
import { afterAll, afterEach, beforeAll, beforeEach, describe, test, vi } from "vitest";
import { expect } from "../expects";
import type { UserCalendarSetup } from "./utils";
import {
  buildCredentialForService,
  CALENDAR_CACHE_FEATURE,
  cleanupUserCalendarSetup,
  createGoogleCalendarApp,
  createUserWithCalendarSetup,
  FAKED_NOW,
} from "./utils";

describe("getCalendar uses batch-prefetched Set for O(1) cache decisions, falling back to per-credential FF when no Set is provided", () => {
  let batchTestData: UserCalendarSetup;

  beforeAll(async () => {
    await createGoogleCalendarApp();
    batchTestData = await createUserWithCalendarSetup(`batch-${Date.now()}`);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupUserCalendarSetup(batchTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  afterEach(async () => {
    await prisma.calendarCacheEvent
      .deleteMany({ where: { selectedCalendarId: batchTestData.selectedCalendarId } })
      .catch(() => {});
  });

  test("wraps with CalendarCacheWrapper when user is in the batch-prefetched Set", async () => {
    const credentialForService = await buildCredentialForService(batchTestData.credential.id);

    const calendar = await getCalendar({
      credential: credentialForService,
      mode: "slots",
      calendarCacheEnabledForUserIds: new Set([batchTestData.user.id]),
    });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).toBe("CalendarCacheWrapper");
  });

  test("skips CalendarCacheWrapper when user is absent from the batch-prefetched Set", async () => {
    const credentialForService = await buildCredentialForService(batchTestData.credential.id);

    const calendar = await getCalendar({
      credential: credentialForService,
      mode: "slots",
      calendarCacheEnabledForUserIds: new Set<number>(),
    });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
  });

  test("falls back to per-credential FF check when no batch Set is provided", async () => {
    const credentialForService = await buildCredentialForService(batchTestData.credential.id);

    const calendar = await getCalendar({ credential: credentialForService, mode: "slots" });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).toBe("CalendarCacheWrapper");
  });
});

describe("getCalendarCredentials uses per-credential FF check (non-batch path)", () => {
  let credTestData: UserCalendarSetup;

  beforeAll(async () => {
    await createGoogleCalendarApp();
    credTestData = await createUserWithCalendarSetup(`cred-${Date.now()}`);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupUserCalendarSetup(credTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  test("wraps with CalendarCacheWrapper when feature flag is enabled for the user", async () => {
    const credentialForService = await buildCredentialForService(credTestData.credential.id);

    const calendarCredentials = getCalendarCredentials([credentialForService]);
    expect(calendarCredentials.length).toBe(1);

    const calendar = await calendarCredentials[0].calendar();
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).toBe("CalendarCacheWrapper");
  });

  test("skips CalendarCacheWrapper when feature flag is disabled globally", async () => {
    await prisma.feature.update({
      where: { slug: CALENDAR_CACHE_FEATURE },
      data: { enabled: false },
    });

    try {
      const credentialForService = await buildCredentialForService(credTestData.credential.id);

      const calendarCredentials = getCalendarCredentials([credentialForService]);
      expect(calendarCredentials.length).toBe(1);

      const calendar = await calendarCredentials[0].calendar();
      expect(calendar).not.toBeNull();
      expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
    } finally {
      await prisma.feature.update({
        where: { slug: CALENDAR_CACHE_FEATURE },
        data: { enabled: true },
      });
    }
  });
});

describe("getCalendar bypasses calendar cache in booking mode", () => {
  let bookingTestData: UserCalendarSetup;

  beforeAll(async () => {
    await createGoogleCalendarApp();
    bookingTestData = await createUserWithCalendarSetup(`booking-${Date.now()}`);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await cleanupUserCalendarSetup(bookingTestData);
  });

  beforeEach(() => {
    vi.setSystemTime(FAKED_NOW);
  });

  test("skips CalendarCacheWrapper in booking mode even when feature flag is enabled", async () => {
    const credentialForService = await buildCredentialForService(bookingTestData.credential.id);

    const calendar = await getCalendar({ credential: credentialForService, mode: "booking" });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
  });

  test("skips CalendarCacheWrapper in booking mode even when batch-prefetched Set includes the user", async () => {
    const credentialForService = await buildCredentialForService(bookingTestData.credential.id);

    const calendar = await getCalendar({
      credential: credentialForService,
      mode: "booking",
      calendarCacheEnabledForUserIds: new Set([bookingTestData.user.id]),
    });
    expect(calendar).not.toBeNull();
    expect(calendar!.constructor.name).not.toBe("CalendarCacheWrapper");
  });
});
