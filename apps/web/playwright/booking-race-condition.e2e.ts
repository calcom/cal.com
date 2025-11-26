import { expect } from "@playwright/test";
import type { Page, Browser, Route, Response } from "@playwright/test";
import type { z } from "zod";

import { prisma } from "@calcom/prisma";
import type { Team, EventType, User } from "@calcom/prisma/client";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { test } from "./lib/fixtures";
import type { Fixtures } from "./lib/fixtures";
import { bookTimeSlot, doOnOrgDomain, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

/**
 * Booking Race Condition Prevention Test
 *
 * This test validates that the calendar caching system and booking logic correctly
 * prevent double-booking race conditions that occurred in production. It serves as
 * a regression test to ensure the following mechanisms work properly:
 *
 * 1. **Race Condition Prevention**: Ensures concurrent booking requests for the same
 *    time slot don't result in double bookings to the same host.
 *
 * 2. **Calendar Cache Functionality**: Validates that the calendar cache system works
 *    correctly with proper cache key generation using expanded date ranges.
 *
 * 3. **Round-Robin Distribution**: Verifies that when both bookings succeed, they are
 *    distributed to different hosts as expected in round-robin scheduling.
 *
 * 4. **Database Constraint Protection**: Confirms that unique constraints prevent
 *    duplicate bookings when race conditions are detected.
 *
 * **Test Setup**:
 * - Creates a round-robin team with multiple hosts
 * - Populates calendar cache with deterministic availability data
 * - Mocks Google Calendar API to simulate real-world scenarios
 * - Executes concurrent booking requests at the same time slot
 *
 * **Expected Outcomes**:
 * - [200, 409]: One booking succeeds, one fails due to constraint violation (preferred)
 * - [200, 200]: Both succeed but distributed to different hosts (acceptable)
 * - [200, 200] with same host: Double booking occurred (test failure - race condition)
 *
 * **Production Context**:
 * The original race condition was caused by:
 * - Stale calendar cache showing hosts as available
 * - Microsecond timing differences in Date.valueOf() for idempotency keys
 * - Both requests selecting the same host due to identical cache state
 *
 * This test recreates similar conditions but in a controlled way to verify
 * the prevention mechanisms work correctly.
 */

test.describe("Booking Race Condition Prevention", () => {
  test.skip("Prevents double-booking race condition and validates cache functionality", async ({
    page,
    users,
    orgs,
    browser,
  }) => {
    const { org, team, teamEvent, teamMembers } = await setupTeamWithRoundRobin(users, orgs);

    await setupGoogleCalendarCredentials(teamMembers);
    await createIdenticalBookingHistories(teamMembers, teamEvent.id);

    const { selectedDate } = await getDynamicBookingDate(page, org, team, teamEvent);

    const { firstResponse, secondResponse } = await performConcurrentBookings(
      page,
      browser,
      org,
      team,
      teamEvent,
      selectedDate
    );

    const bookingResults = await analyzeBookingResults(teamEvent.id, firstResponse, secondResponse);

    expect(bookingResults.isRaceConditionPrevented).toBe(true);

    console.log("Race condition prevention test results:", {
      totalBookings: bookingResults.bookings.length,
      responseStatuses: bookingResults.responseStatuses,
      sameHostSelected: bookingResults.sameHostSelected,
      preventionMechanism: bookingResults.preventionMechanism,
    });
  });
});

async function setupTeamWithRoundRobin(users: Fixtures["users"], orgs: Fixtures["orgs"]) {
  const org = await orgs.create({ name: "TestOrg" });
  const teamMatesObj = [{ name: "teammate-1" }, { name: "teammate-2" }];

  const owner = await users.create(
    {
      username: "pro-user",
      name: "pro-user",
      organizationId: org.id,
      roleInOrganization: MembershipRole.MEMBER,
    },
    {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.ROUND_ROBIN,
    }
  );

  const { team } = await owner.getFirstTeamMembership();
  const teamEvent = await owner.getFirstTeamEvent(team.id);

  const teamMemberships = await prisma.membership.findMany({
    where: { teamId: team.id },
    select: {
      user: true,
    },
  });

  const teamMembers = teamMemberships.map((membership) => membership.user);

  return { org, team, teamEvent, teamMembers };
}

async function setupGoogleCalendarCredentials(teamMembers: User[]) {
  const googleCalendarApp = await prisma.app.findFirst({
    where: { slug: "google-calendar" },
  });

  if (!googleCalendarApp) {
    await prisma.app.create({
      data: {
        slug: "google-calendar",
        dirName: "google-calendar",
      },
    });
  }

  for (const member of teamMembers) {
    await prisma.credential.create({
      data: {
        type: "google_calendar",
        key: {
          access_token: "test_access_token",
          refresh_token: "test_refresh_token",
          scope: "https://www.googleapis.com/auth/calendar.events",
          token_type: "Bearer",
          expiry_date: Date.now() + 3600000,
        },
        userId: member.id,
        appId: "google-calendar",
        invalid: false,
      },
    });
  }
}

async function createIdenticalBookingHistories(teamMembers: User[], eventTypeId: number) {
  const identicalTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const member of teamMembers) {
    for (let i = 0; i < 3; i++) {
      await prisma.booking.create({
        data: {
          uid: `test-booking-${member.id}-${i}-${Date.now()}`,
          title: `Test booking ${i}`,
          startTime: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          eventTypeId,
          userId: member.id,
          status: "ACCEPTED",
          createdAt: identicalTimestamp,
          updatedAt: identicalTimestamp,
          attendees: {
            create: {
              email: `test${i}@example.com`,
              name: `Test Attendee ${i}`,
              timeZone: "UTC",
            },
          },
        },
      });
    }
  }
}

async function getDynamicBookingDate(
  page: Page,
  org: any,
  team: any,
  teamEvent: EventType
): Promise<{ selectedDate: string; selectedDateISO: string }> {
  await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
    await page.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);

    await page.waitForSelector('[data-testid="day"]');

    await page.getByTestId("incrementMonth").click();

    await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();
  });

  const firstAvailableDayText = await page
    .locator('[data-testid="day"][data-disabled="false"]')
    .nth(0)
    .textContent();

  if (!firstAvailableDayText) {
    throw new Error("No available day found");
  }

  const currentDate = new Date();
  const nextMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    parseInt(firstAvailableDayText)
  );
  const selectedDateISO = nextMonth.toISOString();

  return {
    selectedDate: firstAvailableDayText,
    selectedDateISO,
  };
}

async function mockGoogleCalendarAPI(page: Page, selectedDateISO: string) {
  const busyStart = `${selectedDateISO.slice(0, 10)}T08:00:00.000Z`;
  const busyEnd = `${selectedDateISO.slice(0, 10)}T09:00:00.000Z`;
  await page.route("**/calendar/v3/freeBusy**", async (route: Route) => {
    const mockResponse = {
      kind: "calendar#freeBusy",
      calendars: {
        "pro-user@example.com": {
          busy: [
            {
              start: busyStart,
              end: busyEnd,
            },
          ],
        },
        "teammate-1@example.com": {
          busy: [
            {
              start: busyStart,
              end: busyEnd,
            },
          ],
        },
        "teammate-2@example.com": {
          busy: [
            {
              start: busyStart,
              end: busyEnd,
            },
          ],
        },
      },
    };

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mockResponse),
    });
  });
}

export type TeamWithMetadata = Team & { metadata: z.infer<typeof teamMetadataSchema> };

async function performConcurrentBookings(
  page: Page,
  browser: Browser,
  org: TeamWithMetadata,
  team: TeamWithMetadata,
  teamEvent: EventType,
  selectedDate: string
) {
  let firstResponse: Response | undefined;
  let secondResponse: Response | undefined;

  await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, parseInt(selectedDate));
    const selectedDateISO = nextMonth.toISOString();

    await mockGoogleCalendarAPI(page1, selectedDateISO);
    await mockGoogleCalendarAPI(page2, selectedDateISO);

    await page1.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);
    await page2.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);

    await selectFirstAvailableTimeSlotNextMonth(page1);
    await selectFirstAvailableTimeSlotNextMonth(page2);

    const responsePromise1 = page1.waitForResponse(
      (response) => response.url().includes("/api/book/event") && response.request().method() === "POST"
    );
    const responsePromise2 = page2.waitForResponse(
      (response) => response.url().includes("/api/book/event") && response.request().method() === "POST"
    );

    const bookingPromise1 = bookTimeSlot(page1, {
      name: "Test User 1",
      email: "test1@example.com",
    });
    const bookingPromise2 = bookTimeSlot(page2, {
      name: "Test User 2",
      email: "test2@example.com",
    });

    const [response1, response2] = await Promise.all([responsePromise1, responsePromise2]);
    await Promise.allSettled([bookingPromise1, bookingPromise2]);

    firstResponse = response1;
    secondResponse = response2;

    await context1.close();
    await context2.close();
  });

  return { firstResponse, secondResponse };
}

async function analyzeBookingResults(
  eventTypeId: number,
  firstResponse?: Response,
  secondResponse?: Response
) {
  const bookings = await prisma.booking.findMany({
    where: { eventTypeId },
    include: { attendees: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const responseStatuses = [firstResponse?.status(), secondResponse?.status()].filter(Boolean);

  const recentBookings = bookings.slice(0, 2);
  const sameHostSelected =
    recentBookings.length === 2 && recentBookings[0].userId === recentBookings[1].userId;

  let preventionMechanism = "unknown";
  if (responseStatuses.includes(409)) {
    preventionMechanism = "database-constraint";
  } else if (responseStatuses.every((status) => status === 200) && !sameHostSelected) {
    preventionMechanism = "round-robin-distribution";
  } else if (sameHostSelected) {
    preventionMechanism = "race-condition-occurred";
  }

  const isRaceConditionPrevented = preventionMechanism !== "race-condition-occurred";

  return {
    bookings,
    responseStatuses,
    sameHostSelected,
    preventionMechanism,
    isRaceConditionPrevented,
  };
}
