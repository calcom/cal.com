import { expect } from "@playwright/test";

import { randomString } from "@calcom/lib/random";

import { test } from "./lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Booking with Calendar Cache", () => {
  test("should create booking and mark calendar cache as stale when calendar cache is enabled", async ({
    page,
    users,
    features,
    prisma,
  }) => {
    await features.set("calendar-cache", true);

    const user = await users.create();
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

    await user.apiLogin();
    await page.goto(`/${user.username}/${eventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();

    const updatedCache = await prisma.calendarCache.findFirst({
      where: { credentialId: credential.id },
    });
    expect(updatedCache?.stale).toBe(true);

    const booking = await prisma.booking.findFirst({
      where: { userId: user.id },
    });
    expect(booking).toBeTruthy();
    expect(booking?.status).toBe("ACCEPTED");
  });

  test("should invalidate cache for team event with multiple users", async ({
    page,
    users,
    features,
    prisma,
  }) => {
    await features.set("calendar-cache", true);

    const user1 = await users.create({ name: "User 1" });
    const user2 = await users.create({ name: "User 2" });

    const team = await prisma.team.create({
      data: {
        name: "Test Team",
        slug: `test-team-${Date.now()}-${randomString(5)}`,
      },
    });

    await prisma.membership.createMany({
      data: [
        { userId: user1.id, teamId: team.id, accepted: true, role: "OWNER" },
        { userId: user2.id, teamId: team.id, accepted: true, role: "MEMBER" },
      ],
    });

    const teamEventType = await prisma.eventType.create({
      data: {
        title: "Team Meeting",
        slug: `team-meeting-${Date.now()}-${randomString(5)}`,
        length: 30,
        teamId: team.id,
        schedulingType: "COLLECTIVE",
        users: {
          connect: [{ id: user1.id }, { id: user2.id }],
        },
      },
    });

    const credential1 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: JSON.stringify({ access_token: "token1" }),
        userId: user1.id,
        appId: "google-calendar",
      },
    });

    const credential2 = await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: JSON.stringify({ access_token: "token2" }),
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

    await user1.apiLogin();
    await page.goto(`/team/${team.slug}/${teamEventType.slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);

    await expect(page.locator('[data-testid="success-page"]')).toBeVisible();

    const updatedCaches = await prisma.calendarCache.findMany({
      where: {
        credentialId: {
          in: [credential1.id, credential2.id],
        },
      },
    });
    expect(updatedCaches).toHaveLength(2);
    expect(updatedCaches.every((cache) => cache.stale === true)).toBe(true);
  });
});
