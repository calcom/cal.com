import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { MICROSOFT_SUBSCRIPTION_TTL } from "@calcom/app-store/office365calendar/lib/CalendarService";
import { getTimeMax, getTimeMin } from "@calcom/features/calendar-cache/lib/datesForCache";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
import { prisma } from "@calcom/prisma";
import type { EventBusyDate } from "@calcom/types/Calendar";
import { test } from "@calcom/web/playwright/lib/fixtures";

import {
  callWebhook,
  createOutlookCalendarEvents,
  deleteOutlookCalendarEvents,
  setUpTestUserForIntegrationTest,
  setUpTestUserWithOutlookCalendar,
} from "./testUtils";

test.beforeEach(async ({ features }) => {
  const calendar_cache = features.get("calendar-cache");
  if (!calendar_cache?.enabled) {
    features.toggleFeature("calendar-cache");
  }
});

test.afterEach(async ({ users, features }) => {
  await users.deleteAll();
  features.reset();
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ONE_MONTH_IN_MS = 30 * MS_PER_DAY;
const CACHING_TIME = ONE_MONTH_IN_MS;

test.describe("Office365Calendar - Integration Tests", () => {
  test.describe("Calendar Cache - Integration", () => {
    test("On visiting TeamEvent Page, outlook calendar busy slots are fetched from Calendar-Cache", async ({
      page,
      users,
    }) => {
      // Install Outlook Calendar using test account.
      const {
        credentialId,
        destinationCalendar,
        selectedCalendarId,
        externalId,
        user,
        teamSlug,
        teamEventSlug,
      } = await setUpTestUserForIntegrationTest(users);

      // Creates actual events in installed outlook calendar.
      const { outlookCalEventsCreated, expectedCacheKey, expectedCacheValue } =
        await createOutlookCalendarEvents(credentialId!, destinationCalendar, user);

      // The Microsoft Graph API '/subscription' endpoint triggers webhook validation.
      // Webhook validation and receiving notification through webhook requires 'https'.
      // Hence updating directly DB with subscription id and expiration.
      const outlookSubscriptionId = uuidv4();
      const outlookSubscriptionExpiration = new Date(Date.now() + MICROSOFT_SUBSCRIPTION_TTL).toISOString();
      SelectedCalendarRepository.updateById(selectedCalendarId!, {
        outlookSubscriptionId,
        outlookSubscriptionExpiration,
      });

      // Call outlook webhook api with outlookSubscriptionId
      // Triggers fetchAvailabilityAndSetCache()
      const webhookResponse = await callWebhook(
        outlookSubscriptionId,
        outlookSubscriptionExpiration,
        externalId!
      );
      expect(webhookResponse.status).toBe(200);

      // Expect CalendarCache to be created in prisma
      const calendarCache = await prisma.calendarCache.findFirstOrThrow({
        where: { key: expectedCacheKey, credentialId, userId: user.id },
      });
      expect(calendarCache).toBeTruthy();
      const actualCacheValue = calendarCache.value as EventBusyDate[];

      // Deduplicate actualCacheValue based on start and end properties (from parallel test executions)
      const uniqueActualCacheValue = Array.from(
        new Map(actualCacheValue.map((item) => [`${item.start}-${item.end}`, item])).values()
      );

      // Compare deduplicated actualCacheValue with expectedCacheValue
      expect(
        uniqueActualCacheValue.map((item) => ({
          start: new Date(item.start),
          end: new Date(item.end),
        }))
      ).toEqual(
        expectedCacheValue?.map((item) => ({
          start: new Date(item.start),
          end: new Date(item.end),
        }))
      );

      // Now CalendarCache contains busy slots (or events).
      // Delete actual events in real outlook calendar.
      // This step is done to verify that the busy times are fetched from CalendarCache and NOT Graph Apis when booking page is visited with cal.cache=true.
      // Practically the outlook calendar and CalendarCache should be in sync, but this step is done only to test cache functionality (.i.e. to verify that cached data is fetched).
      await deleteOutlookCalendarEvents(outlookCalEventsCreated, credentialId!);

      // Visit Booking page with 'cal.cache=true' and verify cached slots are fetched and not actual from Graph APIs
      // Wait for response from 'getTeamSchedule' on visiting Booking page.
      const getTeamScheduleRespPromise1 = page.waitForResponse(
        (response) => response.url().includes("getTeamSchedule") && response.status() === 200
      );
      await page.goto(`/team/${teamSlug}/${teamEventSlug}?cal.cache=true`);
      await page.waitForLoadState("domcontentloaded");
      await getTeamScheduleRespPromise1;
      // Click on next month and wait for response from 'getTeamSchedule'
      const getTeamScheduleRespPromise2 = page.waitForResponse(
        (response) => response.url().includes("getTeamSchedule") && response.status() === 200
      );
      await page.click('[data-testid="incrementMonth"]');
      await page.waitForLoadState("domcontentloaded");
      await getTeamScheduleRespPromise2;
      // Verify that the first working day of next month has only one slot (as per cached).
      expect(await page.locator('[data-testid="time"]').count()).toBe(1);

      // Visit same page without 'cal.cache=true' and verify actual slots are fetched and not from cache.
      // Actual Events were deleted, so no busy slots, all slots available.
      const getTeamScheduleRespPromise3 = page.waitForResponse(
        (response) => response.url().includes("getTeamSchedule") && response.status() === 200
      );
      await page.goto(page.url().replace("cal.cache=true", ""));
      await page.waitForLoadState("domcontentloaded");
      await getTeamScheduleRespPromise3;
      expect(await page.locator('[data-testid="time"]').count()).toBe(4);
    });
  });
});

test.describe("Office365Calendar", () => {
  test.describe("Calendar Cache", () => {
    test("On visiting TeamEvent Page, outlook calendar busy slots are fetched from Calendar-Cache", async ({
      page,
      users,
    }) => {
      const { credential, teamSlug, teamEventSlug, externalId } = await setUpTestUserWithOutlookCalendar(
        users
      );
      const [testUser] = users.get();

      // Simulate cacheKey and cacheValue to be set in Calendar-Cache table
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const cacheKey = JSON.stringify({
        timeMin: getTimeMin(),
        timeMax: getTimeMax(),
        items: [{ id: externalId }],
      });
      // Mock Busy time - 1st, 2nd, 3rd Days of next month 9AM - 1PM (UTC:0)
      // start - "2025-06-01T09:00:00.000Z"
      // end - "2025-06-01T15:00:00.000Z" , similarly for 2nd , 3rd june
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

      await testUser.apiLogin();

      // Visit TeamEvent page with cal.cache=true
      const getTeamScheduleRespPromise1 = page.waitForResponse(
        (response) => response.url().includes("getTeamSchedule") && response.status() === 200
      );
      await page.goto(`/team/${teamSlug}/${teamEventSlug}?cal.cache=true`);
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
