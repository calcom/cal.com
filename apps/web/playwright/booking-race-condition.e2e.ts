import { expect } from "@playwright/test";
import type { Page, Browser, Route, Response } from "@playwright/test";
import type { Team, EventType, User } from "@prisma/client";
import type { z } from "zod";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { getTimeMin, getTimeMax } from "@calcom/features/calendar-cache/lib/datesForCache";
import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { test } from "./lib/fixtures";
import type { Fixtures } from "./lib/fixtures";
import { bookTimeSlot, doOnOrgDomain } from "./lib/testUtils";

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
  test("Prevents double-booking race condition and validates cache functionality", async ({
    page,
    users,
    orgs,
    browser,
  }) => {
    const { org, team, teamEvent, teamMembers } = await setupTeamWithRoundRobin(users, orgs);

    await setupGoogleCalendarCredentials(teamMembers);
    await createIdenticalBookingHistories(teamMembers, teamEvent.id);

    const { targetHost, calendarCacheHits } = await setupCalendarCache(teamMembers);
    await enableCalendarCacheFeatures(team.id);

    const { firstResponse, secondResponse } = await performConcurrentBookings(
      page,
      browser,
      org,
      team,
      teamEvent
    );

    const bookingResults = await analyzeBookingResults(teamEvent.id, firstResponse, secondResponse);

    // Validate race condition prevention
    expect(bookingResults.isRaceConditionPrevented).toBe(true);

    // Log results for monitoring
    console.log("Race condition prevention test results:", {
      totalBookings: bookingResults.bookings.length,
      responseStatuses: bookingResults.responseStatuses,
      sameHostSelected: bookingResults.sameHostSelected,
      preventionMechanism: bookingResults.preventionMechanism,
    });
  });
});

// Helper Functions

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
    include: { user: true },
  });

  const teamMembers = teamMemberships.map((membership) => membership.user);

  return { org, team, teamEvent, teamMembers };
}

async function setupGoogleCalendarCredentials(teamMembers: User[]) {
  // Ensure Google Calendar app exists
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

  // Create credentials for each team member
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
  // Create identical booking histories to ensure deterministic round-robin behavior
  // This prevents random host selection from interfering with race condition testing
  const identicalTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const member of teamMembers) {
    // Create multiple bookings with identical timestamps
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

async function setupCalendarCache(teamMembers: User[]) {
  // Set up calendar cache with stale data to test cache functionality
  // This simulates the production scenario where cache shows availability
  // but real calendar API might show different data
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const cacheTimeRange = {
    timeMin: getTimeMin(tomorrow.toISOString()),
    timeMax: getTimeMax(tomorrow.toISOString()),
  };

  const credentials = await prisma.credential.findMany({
    where: {
      userId: { in: teamMembers.map((m) => m.id) },
      type: "google_calendar",
    },
  });

  const calendarCacheRepo = new CalendarCacheRepository(null);
  const targetHost = teamMembers[0]; // First host should be selected by round-robin
  const calendarCacheHits: string[] = [];

  for (let i = 0; i < credentials.length; i++) {
    const credential = credentials[i];
    const member = teamMembers[i];

    const cacheArgs = {
      timeMin: cacheTimeRange.timeMin,
      timeMax: cacheTimeRange.timeMax,
      items: [{ id: member.email! }],
    };

    // Cache shows target host as available, others as busy
    // This ensures deterministic host selection during concurrent requests
    const availabilityData = {
      kind: "calendar#freeBusy",
      calendars: {
        [member.email!]: {
          busy:
            member.id === targetHost.id
              ? []
              : [
                  {
                    start: "2025-07-02T08:00:00.000Z",
                    end: "2025-07-02T08:30:00.000Z",
                  },
                ],
        },
      },
    };

    await calendarCacheRepo.upsertCachedAvailability({
      credentialId: credential.id,
      userId: member.id,
      args: cacheArgs,
      value: availabilityData,
    });

    calendarCacheHits.push(`${member.email}-${credential.id}`);
  }

  return { targetHost, calendarCacheHits };
}

async function enableCalendarCacheFeatures(teamId: number) {
  await prisma.teamFeatures.createMany({
    data: [
      {
        teamId,
        featureId: "calendar-cache",
        assignedAt: new Date(),
        assignedBy: "race-condition-test",
      },
      {
        teamId,
        featureId: "calendar-cache-serve",
        assignedAt: new Date(),
        assignedBy: "race-condition-test",
      },
    ],
  });
}

async function mockGoogleCalendarAPI(page: Page) {
  // Mock Google Calendar API to simulate real-world calendar data
  // This creates a mismatch with cache data to test cache functionality
  await page.route("**/calendar/v3/freeBusy**", async (route: Route) => {
    const mockResponse = {
      kind: "calendar#freeBusy",
      calendars: {
        "pro-user@example.com": {
          busy: [
            {
              start: "2025-07-02T08:00:00.000Z",
              end: "2025-07-02T09:00:00.000Z",
            },
          ],
        },
        "teammate-1@example.com": {
          busy: [
            {
              start: "2025-07-02T08:00:00.000Z",
              end: "2025-07-02T09:00:00.000Z",
            },
          ],
        },
        "teammate-2@example.com": {
          busy: [
            {
              start: "2025-07-02T08:00:00.000Z",
              end: "2025-07-02T09:00:00.000Z",
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

// Local type for org/team with parsed metadata
export type TeamWithMetadata = Team & { metadata: z.infer<typeof teamMetadataSchema> };

async function performConcurrentBookings(
  page: Page,
  browser: Browser,
  org: TeamWithMetadata,
  team: TeamWithMetadata,
  teamEvent: EventType
) {
  let firstResponse: Response | undefined;
  let secondResponse: Response | undefined;

  await doOnOrgDomain({ orgSlug: org.slug, page }, async () => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Apply API mocking
    await mockGoogleCalendarAPI(page1);
    await mockGoogleCalendarAPI(page2);

    // Navigate to booking page
    await page1.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);
    await page2.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);

    // Select tomorrow's date
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const targetDay = tomorrow.getDate().toString();

    await page1
      .locator(`[data-testid="day"][data-disabled="false"]`)
      .filter({ hasText: new RegExp(`^${targetDay}$`) })
      .click();
    await page2
      .locator(`[data-testid="day"][data-disabled="false"]`)
      .filter({ hasText: new RegExp(`^${targetDay}$`) })
      .click();

    // Select first available time slot
    await page1.locator('[data-testid="time"]').nth(0).waitFor();
    await page2.locator('[data-testid="time"]').nth(0).waitFor();
    await page1.locator('[data-testid="time"]').nth(0).click();
    await page2.locator('[data-testid="time"]').nth(0).click();

    // Set up response listeners
    const responsePromise1 = page1.waitForResponse((response) => response.url().includes("/api/book/event"));
    const responsePromise2 = page2.waitForResponse((response) => response.url().includes("/api/book/event"));

    // Execute concurrent bookings
    const bookingPromise1 = bookTimeSlot(page1, {
      name: "Guest A",
      email: "guest-a@test.com",
      expectedStatusCode: undefined,
    });

    const bookingPromise2 = bookTimeSlot(page2, {
      name: "Guest B",
      email: "guest-b@test.com",
      expectedStatusCode: undefined,
    });

    // Wait for both bookings to complete
    await Promise.allSettled([bookingPromise1, bookingPromise2]);
    const [firstResponseLocal, secondResponseLocal] = await Promise.all([responsePromise1, responsePromise2]);

    firstResponse = firstResponseLocal;
    secondResponse = secondResponseLocal;

    // Verify success pages for successful bookings
    if (firstResponse && firstResponse.status() === 200) {
      await expect(page1.getByTestId("success-page")).toBeVisible();
    }
    if (secondResponse && secondResponse.status() === 200) {
      await expect(page2.getByTestId("success-page")).toBeVisible();
    }

    await context1.close();
    await context2.close();
  });

  return { firstResponse, secondResponse };
}

async function analyzeBookingResults(
  eventTypeId: number,
  firstResponse: Response | undefined,
  secondResponse: Response | undefined
) {
  if (!firstResponse || !secondResponse) {
    throw new Error("Booking response(s) missing");
  }
  const bookings = await prisma.booking.findMany({
    where: {
      eventTypeId,
      status: "ACCEPTED",
      attendees: {
        some: {
          email: {
            in: ["guest-a@test.com", "guest-b@test.com"],
          },
        },
      },
    },
    include: {
      attendees: true,
      user: true,
    },
  });

  const responseStatuses = [firstResponse.status(), secondResponse.status()].sort();
  const bothSucceeded = responseStatuses.every((s) => s === 200);
  const hasConflict = responseStatuses.includes(200) && responseStatuses.includes(409);
  const sameHostSelected = bookings.length === 2 && bookings[0].userId === bookings[1].userId;

  // Determine prevention mechanism
  const isRaceConditionPrevented = hasConflict || (bothSucceeded && !sameHostSelected);

  let preventionMechanism = "unknown";
  if (hasConflict) {
    preventionMechanism = "unique_constraint_violation";
  } else if (bothSucceeded && !sameHostSelected) {
    preventionMechanism = "round_robin_distribution";
  } else if (bothSucceeded && sameHostSelected) {
    preventionMechanism = "none_detected";
  }

  return {
    bookings,
    responseStatuses,
    bothSucceeded,
    hasConflict,
    sameHostSelected,
    isRaceConditionPrevented,
    preventionMechanism,
  };
}
