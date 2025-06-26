import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";

import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Google Calendar Webhook", () => {
  test("should invalidate cache when receiving valid Google webhook", async ({
    page,
    users,
    webhooks,
    prisma,
  }) => {
    const user = await users.create();
    const [eventType] = user.eventTypes;
    await user.apiLogin();
    const webhookReceiver = await webhooks.createReceiver();

    const credential = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: JSON.stringify({
          access_token: "mock_access_token",
          refresh_token: "mock_refresh_token",
        }),
        userId: user.id,
        appId: "google-calendar",
      },
    });

    const channelId = `test-channel-${randomString(10)}`;
    const selectedCalendar = await prisma.selectedCalendar.create({
      data: {
        userId: user.id,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: credential.id,
        googleChannelId: channelId,
        googleChannelKind: "api#channel",
        googleChannelResourceId: `test-resource-${randomString(10)}`,
        googleChannelResourceUri: "test-resource-uri",
        googleChannelExpiration: "1234567890",
      },
    });

    await prisma.calendarCache.create({
      data: {
        credentialId: credential.id,
        key: JSON.stringify({ timeMin: "2025-01-01", timeMax: "2025-02-01" }),
        value: JSON.stringify([]),
        expiresAt: new Date(Date.now() + 3600000),
        stale: false,
      },
    });

    await page.goto(`/${user.username}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await webhookReceiver.waitForRequestCount(1);

    const response = await page.request.post("/api/integrations/googlecalendar/webhook", {
      headers: {
        "x-goog-channel-token": process.env.GOOGLE_WEBHOOK_TOKEN || "test-token",
        "x-goog-channel-id": channelId,
      },
      data: {},
    });

    expect(response.status()).toBe(200);

    const updatedCache = await prisma.calendarCache.findFirst({
      where: { credentialId: credential.id },
    });
    expect(updatedCache?.stale).toBe(true);
  });

  test("should handle invalid webhook token", async ({ page }) => {
    const response = await page.request.post("/api/integrations/googlecalendar/webhook", {
      headers: {
        "x-goog-channel-token": "invalid-token",
        "x-goog-channel-id": `test-channel-${randomString(10)}`,
      },
      data: {},
    });

    expect(response.status()).toBe(403);
  });

  test("should handle missing channel ID", async ({ page }) => {
    const response = await page.request.post("/api/integrations/googlecalendar/webhook", {
      headers: {
        "x-goog-channel-token": process.env.GOOGLE_WEBHOOK_TOKEN || "test-token",
      },
      data: {},
    });

    expect(response.status()).toBe(403);
  });
});
