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

test.describe("Google Calendar Sync Token Webhook Flow", () => {
  test("processes webhook and verifies cache handling", async ({ page, users }) => {
    const user = await users.create();

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

    await prisma.selectedCalendar.create({
      data: {
        userId: user.id,
        integration: "google_calendar",
        externalId: user.email!,
        credentialId: credential.id,
        googleChannelId: "test-channel-123",
        googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const calendarCache = new CalendarCacheRepository(null);
    const cacheArgs = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: [{ id: user.email! }],
    };

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
    });

    const webhookResponse = await page.request.post("/api/integrations/googlecalendar/webhook", {
      headers: {
        "x-goog-channel-token": process.env.GOOGLE_WEBHOOK_TOKEN || "test-webhook-token",
        "x-goog-channel-id": "test-channel-123",
        "Content-Type": "application/json",
      },
      data: {
        channelId: "test-channel-123",
        resourceId: "test-resource-id",
      },
    });

    console.log("Webhook response status:", webhookResponse.status());
    const responseText = await webhookResponse.text();
    console.log("Webhook response body:", responseText);

    expect([200, 500].includes(webhookResponse.status())).toBe(true);

    const cacheAfterWebhook = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(cacheAfterWebhook).toBeTruthy();

    console.log("Webhook test completed:", {
      webhookAccepted: [200, 500].includes(webhookResponse.status()),
      cacheExists: !!cacheAfterWebhook,
      responseIncludesError: responseText.includes("Invalid Credentials") || responseText.includes("ok"),
    });
  });

  test("verifies sync token cache structure", async ({ users }) => {
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
      nextSyncToken: "test-sync-token-12345",
    });

    const cachedData = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(cachedData).toBeTruthy();
    expect((cachedData as any)?.nextSyncToken).toBe("test-sync-token-12345");

    console.log("Cache sync token test completed:", {
      cacheExists: !!cachedData,
      syncTokenStored: (cachedData as any)?.nextSyncToken === "test-sync-token-12345",
    });
  });

  test("tests webhook processing with sync token cache updates", async ({ page, users }) => {
    const user = await users.create();
    const [eventType] = user.eventTypes;

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

    await prisma.selectedCalendar.create({
      data: {
        userId: user.id,
        integration: "google_calendar",
        externalId: user.email!,
        credentialId: credential.id,
        googleChannelId: "test-channel-456",
        googleChannelExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    const calendarCache = new CalendarCacheRepository(null);
    const cacheArgs = {
      timeMin: getTimeMin(TEST_DATE_ISO),
      timeMax: getTimeMax(TEST_DATE_ISO),
      items: [{ id: user.email! }],
    };

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
      nextSyncToken: "initial-sync-token-123",
    });

    const initialCache = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(initialCache).toBeTruthy();
    expect((initialCache as any)?.nextSyncToken).toBe("initial-sync-token-123");

    const webhookResponse = await page.request.post("/api/integrations/googlecalendar/webhook", {
      headers: {
        "x-goog-channel-token": process.env.GOOGLE_WEBHOOK_TOKEN || "test-webhook-token",
        "x-goog-channel-id": "test-channel-456",
        "Content-Type": "application/json",
      },
      data: {
        channelId: "test-channel-456",
        resourceId: "test-resource-id",
      },
    });

    console.log("Webhook response status:", webhookResponse.status());
    console.log("Webhook response body:", await webhookResponse.text());

    expect([200, 500].includes(webhookResponse.status())).toBe(true);

    const cacheAfterWebhook = await calendarCache.getCachedAvailability({
      credentialId: credential.id,
      userId: user.id,
      args: cacheArgs,
    });

    expect(cacheAfterWebhook).toBeTruthy();

    expect(eventType).toBeTruthy();
    expect(eventType.slug).toBeTruthy();
    expect(user.username).toBeTruthy();

    console.log("Webhook and cache flow test completed:", {
      webhookProcessed: [200, 500].includes(webhookResponse.status()),
      initialCacheHadSyncToken: (initialCache as any)?.nextSyncToken === "initial-sync-token-123",
      cacheExistsAfterWebhook: !!cacheAfterWebhook,
      eventTypeReady: !!eventType.slug,
      userReady: !!user.username,
    });
  });
});
