import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Calendar Cache Booking", () => {
  test("should create booking and mark calendar cache as stale when calendar cache is enabled", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    test.setTimeout(testInfo.timeout * 2);
    const user = await users.create();
    await user.apiLogin();
    const [eventType] = user.eventTypes;

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

    await prisma.selectedCalendar.create({
      data: {
        userId: user.id,
        integration: "google_calendar",
        externalId: "test@example.com",
        credentialId: credential.id,
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
    await page.locator('[data-testid="time"]').first().click();
    await page.fill('[name="name"]', "Test Booker");
    await page.fill('[name="email"]', `test-${randomString(10)}@example.com`);
    await page.click('[type="submit"]');

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();

    const updatedCache = await prisma.calendarCache.findFirst({
      where: { credentialId: credential.id },
    });
    expect(updatedCache?.stale).toBe(true);
  });

  test("should create booking and invalidate cache for team event with multiple users", async ({
    page,
    users,
    prisma,
  }, testInfo) => {
    test.setTimeout(testInfo.timeout * 2);
    const user1 = await users.create({ name: "User 1" });
    const user2 = await users.create({ name: "User 2" });
    await user1.apiLogin();

    const teamEventType = await prisma.eventType.create({
      data: {
        title: "Team Event",
        slug: `team-event-${randomString(10)}`,
        length: 30,
        schedulingType: "COLLECTIVE",
        userId: user1.id,
        users: {
          connect: [{ id: user1.id }, { id: user2.id }],
        },
      },
    });

    const credential1 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: JSON.stringify({
          access_token: "mock_access_token_1",
          refresh_token: "mock_refresh_token_1",
        }),
        userId: user1.id,
        appId: "google-calendar",
      },
    });

    const credential2 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: JSON.stringify({
          access_token: "mock_access_token_2",
          refresh_token: "mock_refresh_token_2",
        }),
        userId: user2.id,
        appId: "google-calendar",
      },
    });

    await prisma.calendarCache.createMany({
      data: [
        {
          credentialId: credential1.id,
          key: JSON.stringify({ timeMin: "2025-01-01", timeMax: "2025-02-01" }),
          value: JSON.stringify([]),
          expiresAt: new Date(Date.now() + 3600000),
          stale: false,
        },
        {
          credentialId: credential2.id,
          key: JSON.stringify({ timeMin: "2025-01-01", timeMax: "2025-02-01" }),
          value: JSON.stringify([]),
          expiresAt: new Date(Date.now() + 3600000),
          stale: false,
        },
      ],
    });

    await page.goto(`/${user1.username}/${teamEventType.slug}`);
    await page.locator('[data-testid="time"]').first().click();
    await page.fill('[name="name"]', "Team Booker");
    await page.fill('[name="email"]', `team-test-${randomString(10)}@example.com`);
    await page.click('[type="submit"]');

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();

    const updatedCaches = await prisma.calendarCache.findMany({
      where: {
        credentialId: { in: [credential1.id, credential2.id] },
      },
    });
    expect(updatedCaches).toHaveLength(2);
    expect(updatedCaches.every((cache) => cache.stale === true)).toBe(true);
  });
});
