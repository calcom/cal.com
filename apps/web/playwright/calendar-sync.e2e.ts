import prisma from "@calcom/prisma";

import { test, todo } from "./lib/fixtures";
import type { Fixtures } from "./lib/fixtures";

async function setupGoogleCalendarCredential({ users }: { users: Fixtures["users"] }) {
  const user = await users.create();
  await user.apiLogin();
  await prisma.credential.create({
    data: {
      type: "mock_calendar",
      appId: "mock-calendar-app",
      userId: user.id,
      key: {
        scope:
          "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
        id_token: "mock_id_token",
        token_type: "Bearer",
        expiry_date: -1,
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
      },
    },
  });
  return user;
}

test.describe("calendar sync for Google Calendar", () => {
  test.beforeAll(async () => {
    await prisma.app.create({
      data: {
        slug: "mock-calendar-app",
        dirName: "mock-calendar-app",
        enabled: true,
        categories: ["calendar"],
      },
    });
  });
  test("Booking should save a `BookingReference` with `rawData`", async ({ page, users }) => {
    const user = await setupGoogleCalendarCredential({ users });
    await page.goto("/apps/installed");
    await page.pause();
  });
  todo("should cancel event on Cal.com when it's deleted on Google Calendar");
  todo("should reschedule event on Cal.com when it's rescheduled on Google Calendar");
});
