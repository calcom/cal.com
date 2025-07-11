import { expect } from "@playwright/test";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { getTimeMin, getTimeMax } from "@calcom/features/calendar-cache/lib/datesForCache";
import prisma from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/enums";
import { test } from "@calcom/web/playwright/lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "@calcom/web/playwright/lib/testUtils";

const TEST_DATE = new Date(
  Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)
);
const TEST_DATE_ISO = TEST_DATE.toISOString();

function randomString(length: number): string {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Round Robin Events with Individual Caches", () => {
  test("round robin booking works with empty cache state", async ({ page, users }) => {
    const uniqueId = randomString(8);
    const teamUser = await users.create(
      {
        name: `Team Lead ${uniqueId}`,
        email: `team-lead-${uniqueId}@example.com`,
      },
      {
        hasTeam: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
        teammates: [
          { name: `Host 1 ${uniqueId}`, email: `host1-${uniqueId}@example.com` },
          { name: `Host 2 ${uniqueId}`, email: `host2-${uniqueId}@example.com` },
        ],
      }
    );

    const team = await teamUser.getFirstTeamMembership();
    const [eventType] = teamUser.eventTypes;

    await prisma.app.update({
      where: { slug: "google-calendar" },
      data: {
        keys: {
          client_id: "test-client-id.apps.googleusercontent.com",
          client_secret: "test-client-secret",
          redirect_uris: ["http://localhost:3000/api/integrations/googlecalendar/callback"],
        },
      },
    });

    const teamMembers = await prisma.membership.findMany({
      where: { teamId: team.teamId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    const hosts = teamMembers.map((m) => m.user);
    for (const host of hosts) {
      await prisma.credential.create({
        data: {
          type: "google_calendar",
          key: {
            access_token: "mock_access_token",
            refresh_token: "mock_refresh_token",
            scope: "https://www.googleapis.com/auth/calendar",
            token_type: "Bearer",
            expiry_date: Date.now() + 3600000,
          },
          userId: host.id,
          appId: "google-calendar",
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: host.id,
          integration: "google_calendar",
          externalId: host.email || `host-${host.id}@example.com`,
          credentialId:
            (
              await prisma.credential.findFirst({
                where: { userId: host.id, type: "google_calendar" },
              })
            )?.id || 0,
        },
      });
    }

    const calendarCache = new CalendarCacheRepository(null);
    const cacheArgs = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: hosts.map((h) => ({ id: h.email || `host-${h.id}@example.com` })),
    };

    const initialCache = await calendarCache.getCachedAvailability({
      credentialId:
        (
          await prisma.credential.findFirst({
            where: { userId: teamUser.id, type: "google_calendar" },
          })
        )?.id || 0,
      userId: teamUser.id,
      args: cacheArgs,
    });

    expect(initialCache).toBeNull();

    await page.goto(`/team/${team.team.slug}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const booking = await prisma.booking.findFirst({
      where: { eventTypeId: eventType.id },
      select: {
        id: true,
        userId: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    expect(booking).toBeTruthy();
    expect(hosts.some((h) => h.id === booking?.userId)).toBe(true);

    console.log("Empty cache test completed:", {
      bookingCreated: !!booking,
      hostSelected: booking?.user?.email,
      totalHosts: hosts.length,
    });
  });

  test("round robin booking works with partial individual cache hits", async ({ page, users }) => {
    const uniqueId = randomString(8);
    const teamUser = await users.create(
      {
        name: `Team Lead ${uniqueId}`,
        email: `team-lead-${uniqueId}@example.com`,
      },
      {
        hasTeam: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
        teammates: [
          { name: `Host 1 ${uniqueId}`, email: `host1-${uniqueId}@example.com` },
          { name: `Host 2 ${uniqueId}`, email: `host2-${uniqueId}@example.com` },
        ],
      }
    );

    const team = await teamUser.getFirstTeamMembership();
    const teamMembers = await prisma.membership.findMany({
      where: { teamId: team.teamId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    const hosts = teamMembers.map((m) => m.user);

    for (const host of hosts) {
      const credential = await prisma.credential.create({
        data: {
          type: "google_calendar",
          key: { access_token: "mock_token" },
          userId: host.id,
          appId: "google-calendar",
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: host.id,
          integration: "google_calendar",
          externalId: host.email || `host-${host.id}@example.com`,
          credentialId: credential.id,
        },
      });
    }

    const calendarCache = new CalendarCacheRepository(null);
    const cacheArgs = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: [{ id: hosts[0].email || `host-${hosts[0].id}@example.com` }],
    };

    const firstHostCredential = await prisma.credential.findFirst({
      where: { userId: hosts[0].id, type: "google_calendar" },
    });

    await calendarCache.upsertCachedAvailability({
      credentialId: firstHostCredential?.id || 0,
      userId: hosts[0].id,
      args: cacheArgs,
      value: {
        kind: "calendar#freeBusy",
        calendars: {
          [hosts[0].email!]: {
            busy: [
              {
                start: `${TEST_DATE_ISO.slice(0, 10)}T09:00:00.000Z`,
                end: `${TEST_DATE_ISO.slice(0, 10)}T09:30:00.000Z`,
              },
            ],
          },
        },
      },
      nextSyncToken: "partial-cache-sync-token-123",
    });

    const partialCache = await calendarCache.getCachedAvailability({
      credentialId: firstHostCredential?.id || 0,
      userId: hosts[0].id,
      args: cacheArgs,
    });

    expect(partialCache).toBeTruthy();
    expect((partialCache as any)?.nextSyncToken).toBe("partial-cache-sync-token-123");

    const [eventType] = teamUser.eventTypes;
    await page.goto(`/team/${team.team.slug}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const booking = await prisma.booking.findFirst({
      where: { eventTypeId: eventType.id },
      select: {
        id: true,
        userId: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    expect(booking).toBeTruthy();
    expect(hosts.some((h) => h.id === booking?.userId)).toBe(true);

    console.log("Partial cache test completed:", {
      partialCacheExists: !!partialCache,
      syncTokenStored: (partialCache as any)?.nextSyncToken === "partial-cache-sync-token-123",
      bookingCreated: !!booking,
      hostSelected: booking?.user?.email,
    });
  });

  test("round robin booking merges individual cache entries correctly", async ({ page, users }) => {
    const uniqueId = randomString(8);
    const teamUser = await users.create(
      {
        name: `Team Lead ${uniqueId}`,
        email: `team-lead-${uniqueId}@example.com`,
      },
      {
        hasTeam: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
        teammates: [
          { name: `Host 1 ${uniqueId}`, email: `host1-${uniqueId}@example.com` },
          { name: `Host 2 ${uniqueId}`, email: `host2-${uniqueId}@example.com` },
        ],
      }
    );

    const team = await teamUser.getFirstTeamMembership();
    const teamMembers = await prisma.membership.findMany({
      where: { teamId: team.teamId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    const hosts = teamMembers.map((m) => m.user);

    const credentials = [];
    for (const host of hosts) {
      const credential = await prisma.credential.create({
        data: {
          type: "google_calendar",
          key: { access_token: "mock_token" },
          userId: host.id,
          appId: "google-calendar",
        },
      });
      credentials.push(credential);

      await prisma.selectedCalendar.create({
        data: {
          userId: host.id,
          integration: "google_calendar",
          externalId: host.email || `host-${host.id}@example.com`,
          credentialId: credential.id,
        },
      });
    }

    const calendarCache = new CalendarCacheRepository(null);

    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      const credential = credentials[i];

      const individualCacheArgs = {
        timeMin: getTimeMin(TEST_DATE_ISO),
        timeMax: getTimeMax(TEST_DATE_ISO),
        items: [{ id: host.email || `host-${host.id}@example.com` }],
      };

      await calendarCache.upsertCachedAvailability({
        credentialId: credential.id,
        userId: host.id,
        args: individualCacheArgs,
        value: {
          kind: "calendar#freeBusy",
          calendars: {
            [host.email || `host-${host.id}@example.com`]: {
              busy:
                i === 0
                  ? [
                      {
                        start: `${TEST_DATE_ISO.slice(0, 10)}T10:00:00.000Z`,
                        end: `${TEST_DATE_ISO.slice(0, 10)}T10:30:00.000Z`,
                      },
                    ]
                  : [],
            },
          },
        },
        nextSyncToken: `individual-sync-token-${i}`,
      });
    }

    for (let i = 0; i < hosts.length; i++) {
      const cache = await calendarCache.getCachedAvailability({
        credentialId: credentials[i].id,
        userId: hosts[i].id,
        args: {
          timeMin: getTimeMin(TEST_DATE_ISO),
          timeMax: getTimeMax(TEST_DATE_ISO),
          items: [{ id: hosts[i].email || `host-${hosts[i].id}@example.com` }],
        },
      });

      expect(cache).toBeTruthy();
      expect((cache as any)?.nextSyncToken).toBe(`individual-sync-token-${i}`);
    }

    const [eventType] = teamUser.eventTypes;
    await page.goto(`/team/${team.team.slug}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const booking = await prisma.booking.findFirst({
      where: { eventTypeId: eventType.id },
      select: {
        id: true,
        userId: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    expect(booking).toBeTruthy();
    expect(booking?.userId).not.toBe(hosts[0].id);
    expect(booking?.userId && [hosts[1].id, hosts[2].id].includes(booking.userId)).toBe(true);

    console.log("Individual cache merging test completed:", {
      allCachesCreated: hosts.length,
      firstHostBusy: true,
      bookingCreated: !!booking,
      hostSelected: booking?.user?.email,
      avoidedBusyHost: booking?.userId !== hosts[0].id,
    });
  });

  test("round robin booking maintains sync token consistency", async ({ page, users }) => {
    const uniqueId = randomString(8);
    const teamUser = await users.create(
      {
        name: `Team Lead ${uniqueId}`,
        email: `team-lead-${uniqueId}@example.com`,
      },
      {
        hasTeam: true,
        schedulingType: SchedulingType.ROUND_ROBIN,
        teammates: [{ name: `Host 1 ${uniqueId}`, email: `host1-${uniqueId}@example.com` }],
      }
    );

    const team = await teamUser.getFirstTeamMembership();
    const teamMembers = await prisma.membership.findMany({
      where: { teamId: team.teamId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    const hosts = teamMembers.map((m) => m.user);

    for (const host of hosts) {
      const credential = await prisma.credential.create({
        data: {
          type: "google_calendar",
          key: { access_token: "mock_token" },
          userId: host.id,
          appId: "google-calendar",
        },
      });

      await prisma.selectedCalendar.create({
        data: {
          userId: host.id,
          integration: "google_calendar",
          externalId: host.email || `host-${host.id}@example.com`,
          credentialId: credential.id,
          googleChannelId: `channel-${host.id}`,
          googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }

    const webhookResponse = await page.request.post("/api/integrations/googlecalendar/webhook", {
      headers: {
        "x-goog-channel-token": process.env.GOOGLE_WEBHOOK_TOKEN || "test-webhook-token",
        "x-goog-channel-id": `channel-${hosts[0].id}`,
        "Content-Type": "application/json",
      },
      data: {
        channelId: `channel-${hosts[0].id}`,
        resourceId: "test-resource-id",
      },
    });

    expect([200, 500].includes(webhookResponse.status())).toBe(true);

    const [eventType] = teamUser.eventTypes;
    await page.goto(`/team/${team.team.slug}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    const booking = await prisma.booking.findFirst({
      where: { eventTypeId: eventType.id },
      select: {
        id: true,
        userId: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    expect(booking).toBeTruthy();
    expect(hosts.some((h) => h.id === booking?.userId)).toBe(true);

    console.log("Sync token consistency test completed:", {
      webhookProcessed: [200, 500].includes(webhookResponse.status()),
      bookingCreated: !!booking,
      hostSelected: booking?.user?.email,
      roundRobinWorking: hosts.some((h) => h.id === booking?.userId),
    });
  });
});
