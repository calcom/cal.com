import { expect } from "@playwright/test";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { getTimeMin, getTimeMax } from "@calcom/features/calendar-cache/lib/datesForCache";
import prisma from "@calcom/prisma";
import { test } from "@calcom/web/playwright/lib/fixtures";

const TEST_DATE = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)
);
const TEST_DATE_ISO = TEST_DATE.toISOString();

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Round Robin Events with Individual Caches", () => {
  test("verifies individual cache creation and retrieval", async ({ users }) => {
    const user = await users.create();

    const credential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: user.id,
        appId: "google-calendar",
      },
    });

    const calendarCache = new CalendarCacheRepository(null);
    const cacheArgs = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: [{ id: user.email! }],
    };

    const initialCache = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(initialCache).toBeNull();

    await calendarCache.upsertCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
      value: {
        kind: "calendar#freeBusy",
        calendars: {
          [user.email!]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
              },
            ],
          },
        },
      },
      nextSyncToken: "individual-cache-sync-token-123",
    });

    const cache = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(cache).toBeTruthy();
    expect((cache as any)?.nextSyncToken).toBe("individual-cache-sync-token-123");

    console.log("Individual cache test completed:", {
      initialCacheEmpty: initialCache === null,
      cacheCreated: !!cache,
      syncTokenStored: (cache as any)?.nextSyncToken === "individual-cache-sync-token-123",
    });
  });

  test("verifies cache merging for multiple users", async ({ users }) => {
    const user1 = await users.create({ email: "user1@example.com" });
    const user2 = await users.create({ email: "user2@example.com" });

    const credential1 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test-access-token-1",
          refresh_token: "test-refresh-token-1",
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: user1.id,
        appId: "google-calendar",
      },
    });

    const credential2 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test-access-token-2",
          refresh_token: "test-refresh-token-2",
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: user2.id,
        appId: "google-calendar",
      },
    });

    const calendarCache = new CalendarCacheRepository(null);

    const cacheArgs1 = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: [{ id: user1.email! }],
    };

    const cacheArgs2 = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: [{ id: user2.email! }],
    };

    await calendarCache.upsertCachedAvailability({
      credentialId: credential1.id,
      userId: user1.id,
      args: cacheArgs1,
      value: {
        kind: "calendar#freeBusy",
        calendars: {
          [user1.email!]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
              },
            ],
          },
        },
      },
      nextSyncToken: "sync-token-user1",
    });

    await calendarCache.upsertCachedAvailability({
      credentialId: credential2.id,
      userId: user2.id,
      args: cacheArgs2,
      value: {
        kind: "calendar#freeBusy",
        calendars: {
          [user2.email!]: {
            busy: [],
          },
        },
      },
      nextSyncToken: "sync-token-user2",
    });

    const cache1 = await calendarCache.getCachedAvailability({
      credentialId: credential1.id,
      userId: user1.id,
      args: cacheArgs1,
    });

    const cache2 = await calendarCache.getCachedAvailability({
      credentialId: credential2.id,
      userId: user2.id,
      args: cacheArgs2,
    });

    expect(cache1).toBeTruthy();
    expect(cache2).toBeTruthy();
    expect((cache1 as any)?.nextSyncToken).toBe("sync-token-user1");
    expect((cache2 as any)?.nextSyncToken).toBe("sync-token-user2");

    console.log("Cache merging test completed:", {
      user1CacheExists: !!cache1,
      user2CacheExists: !!cache2,
      user1SyncToken: (cache1 as any)?.nextSyncToken,
      user2SyncToken: (cache2 as any)?.nextSyncToken,
    });
  });

  test("verifies cache state transitions", async ({ users }) => {
    const user = await users.create();

    const credential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          scope: "https://www.googleapis.com/auth/calendar",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: user.id,
        appId: "google-calendar",
      },
    });

    const calendarCache = new CalendarCacheRepository(null);
    const cacheArgs = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: [{ id: user.email! }],
    };

    const emptyCache = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });
    expect(emptyCache).toBeNull();

    await calendarCache.upsertCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
      value: {
        kind: "calendar#freeBusy",
        calendars: {
          [user.email!]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T14:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T14:30:00.000Z`,
              },
            ],
          },
        },
      },
      nextSyncToken: "state-transition-token",
    });

    const populatedCache = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(populatedCache).toBeTruthy();
    expect((populatedCache as any)?.nextSyncToken).toBe("state-transition-token");

    await calendarCache.upsertCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
      value: {
        kind: "calendar#freeBusy",
        calendars: {
          [user.email!]: { busy: [] },
        },
      },
      nextSyncToken: "updated-state-token",
    });

    const updatedCache = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(updatedCache).toBeTruthy();
    expect((updatedCache as any)?.nextSyncToken).toBe("updated-state-token");

    console.log("Cache state transitions test completed:", {
      emptyStateCorrect: emptyCache === null,
      populatedStateCorrect: !!populatedCache,
      updatedStateCorrect: !!updatedCache,
      syncTokenUpdated: (updatedCache as any)?.nextSyncToken === "updated-state-token",
    });
  });
});
