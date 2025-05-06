import { expect } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";

import { prisma } from "@calcom/prisma";
import { SchedulingType } from "@calcom/prisma/client";

import { test } from "./lib/fixtures";

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_MONTH_IN_MS = 30 * MS_PER_DAY;
const CACHING_TIME = ONE_MONTH_IN_MS;

const outlookCalendarExternalId = "mock_outlook_external_id_1";
async function setUpTestUserWithOutlookCalendar(users: ReturnType<typeof createUsersFixture>) {
  const integration = "office365_calendar";
  const email = "testCal@outlook.com";

  const app = await prisma.app.update({
    where: {
      slug: "office365-calendar",
    },
    data: {
      keys: {
        client_id: "mock_outlook_cal_client_id",
        client_secret: "mock_outlook_cal_client_secret",
      },
    },
  });

  const testUser = await users.create(null, {
    hasTeam: true,
    schedulingType: SchedulingType.ROUND_ROBIN,
    teamEventLength: 120,
  });

  const credential = await prisma.credential.create({
    data: {
      type: integration,
      key: {
        email,
        scope: "User.Read Calendars.Read Calendars.ReadWrite",
        token_type: "Bearer",
        expiry_date: 1746452074000,
        access_token: "mock_access_token",
        refresh_token: "mock_refresh_token",
        ext_expires_in: 3600,
      },
      user: {
        connect: {
          id: testUser.id,
        },
      },
      app: {
        connect: {
          slug: app.slug,
        },
      },
    },
  });

  await prisma.selectedCalendar.create({
    data: {
      user: {
        connect: {
          id: testUser.id,
        },
      },
      integration,
      externalId: outlookCalendarExternalId,
      credential: {
        connect: {
          id: credential.id,
        },
      },
    },
  });

  await prisma.destinationCalendar.create({
    data: {
      user: {
        connect: {
          id: testUser.id,
        },
      },
      integration,
      externalId: outlookCalendarExternalId,
      primaryEmail: email,
      credential: {
        connect: {
          id: credential.id,
        },
      },
    },
  });

  return credential;
}

test.describe("Office365Calendar", () => {
  test.describe("Calendar Cache", () => {
    test("On visiting TeamEvent Page, outlook calendar busy slots are fetched from Calendar-Cache", async ({
      page,
      users,
    }) => {
      const credential = await setUpTestUserWithOutlookCalendar(users);
      const [testUser] = users.get();

      // Simulate cacheKey and cacheValue to be set in Calendar-Cache table
      // Example, If Current time is "2025-05-06T12:00:00.000Z" , May6th
      // timeMin - "2025-05-01T00:00:00.000Z"
      // timeMax - "2025-07-01T00:00:00.000Z"
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const cacheKey = JSON.stringify({
        timeMin: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)).toISOString(),
        timeMax: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 2, 1, 0, 0, 0)).toISOString(),
        items: [{ id: outlookCalendarExternalId }],
      });
      // Mock Busy time - 1st, 2nd, 3rd Days of next month 9AM - 2PM (UTC:0)
      // start - "2025-06-01T09:00:00.000Z"
      // end - "2025-06-01T15:00:00.000Z"
      const cacheValue = [
        {
          start: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 1, 9, 0, 0)).toISOString(),
          end: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 1, 13, 0, 0)).toISOString(),
        },
        {
          start: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 2, 9, 0, 0)).toISOString(),
          end: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 2, 13, 0, 0)).toISOString(),
        },
        {
          start: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 3, 9, 0, 0)).toISOString(),
          end: new Date(Date.UTC(nextMonth.getFullYear(), nextMonth.getMonth(), 3, 13, 0, 0)).toISOString(),
        },
      ];
      // Create Cache to test
      await prisma.calendarCache.create({
        data: {
          key: cacheKey,
          value: cacheValue,
          userId: testUser.id,
          expiresAt: new Date(Date.now() + CACHING_TIME),
          credential: {
            connect: {
              id: credential.id,
            },
          },
        },
      });

      // Visit Team page with cal.cache=true
      const team = await testUser.getFirstTeamMembership();
      await page.goto(`/team/${team.team.slug}?cal.cache=true`);
      await page.waitForLoadState("domcontentloaded");
      await testUser.apiLogin();

      // Click first event type and wait for response from getTeamSchedule
      const getTeamScheduleRespPromise1 = page.waitForResponse(
        (response) => response.url().includes("getTeamSchedule") && response.status() === 200
      );
      await page.click('[data-testid="event-type-link"]');
      await page.waitForLoadState("domcontentloaded");
      await getTeamScheduleRespPromise1;

      // Click on next month and wait for response from getTeamSchedule
      const getTeamScheduleRespPromise2 = page.waitForResponse(
        (response) => response.url().includes("getTeamSchedule") && response.status() === 200
      );
      await page.click('[data-testid="incrementMonth"]');
      await page.waitForLoadState("domcontentloaded");
      await getTeamScheduleRespPromise2;

      // Verify that the first working day of next month has only one slot
      // As the Calendar-Cache was updated with busy times such that 1,2,3 Days of next month shows only one slot
      // For all other days full 4 slots would be shown
      expect(await page.locator('[data-testid="time"]').count()).toBe(1);
    });
  });
});
