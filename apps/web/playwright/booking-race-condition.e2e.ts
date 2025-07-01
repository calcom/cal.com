import { expect } from "@playwright/test";

import { CalendarCacheRepository } from "@calcom/features/calendar-cache/calendar-cache.repository";
import { prisma } from "@calcom/prisma";
import { MembershipRole, SchedulingType } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import { bookTimeSlot, doOnOrgDomain } from "./lib/testUtils";

test.describe("Booking Race Condition", () => {
  test("Reproduces double-booking race condition with calendar-cache-serve enabled", async ({
    page,
    users,
    orgs,
    browser,
  }) => {
    // Mock Google Calendar API to return BUSY times (reality: hosts are busy)
    // This creates a mismatch with our stale cache (which shows hosts as available)
    const mockGoogleCalendarAPI = async (page: any) => {
      await page.route("**/calendar/v3/freeBusy**", async (route: any) => {
        console.log("🔍 Intercepted Google Calendar freeBusy API call:", route.request().url());
        console.log("📋 Request body:", route.request().postData());

        // Mock response showing hosts are BUSY during our target time slot
        // This creates cache vs reality mismatch (cache=available, reality=busy)
        const mockResponse = {
          kind: "calendar#freeBusy",
          calendars: {
            // Host appears busy in "real" calendar
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
    };
    const org = await orgs.create({
      name: "TestOrg",
    });

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

    // Get team members to add Google Calendar credentials
    const teamMemberships = await prisma.membership.findMany({
      where: {
        teamId: team.id,
      },
      include: {
        user: true,
      },
    });

    const teamMembers = teamMemberships.map((membership) => membership.user);

    console.log(
      "📝 Found team members:",
      teamMembers.map((m) => ({ id: m.id, email: m.email }))
    );

    // Add Google Calendar credentials to team members
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

    // Create Google Calendar credentials for both team members
    for (const member of teamMembers) {
      await prisma.credential.create({
        data: {
          type: "google_calendar",
          key: {
            access_token: "test_access_token",
            refresh_token: "test_refresh_token",
            scope: "https://www.googleapis.com/auth/calendar.events",
            token_type: "Bearer",
            expiry_date: Date.now() + 3600000, // 1 hour in future
          },
          userId: member.id,
          appId: "google-calendar",
          invalid: false,
        },
      });
    }

    console.log("✅ Added Google Calendar credentials to team members");

    // CRITICAL: Create identical booking histories to trigger race condition
    // This makes leastRecentlyBookedUser return the same user deterministically
    console.log("📚 Creating identical booking histories for race condition...");
    const identicalBookingTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

    // Create multiple bookings with EXACTLY the same timestamp for each user to force deterministic sorting
    for (const member of teamMembers) {
      // Create 3 identical bookings to really force the timestamp collision
      for (let i = 0; i < 3; i++) {
        await prisma.booking.create({
          data: {
            uid: `fake-booking-${member.id}-${i}-${Date.now()}`,
            title: `Fake booking ${i} for race condition test`,
            startTime: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000), // Different days but same created timestamp
            endTime: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            eventTypeId: teamEvent.id,
            userId: member.id,
            status: "ACCEPTED",
            createdAt: identicalBookingTimestamp, // EXACT SAME timestamp for all!
            updatedAt: identicalBookingTimestamp,
            attendees: {
              create: {
                email: `fake${i}@example.com`,
                name: `Fake Attendee ${i}`,
                timeZone: "UTC",
              },
            },
          },
        });
      }
      console.log(
        `📝 Created 3 fake bookings for user ${
          member.id
        } with identical timestamp ${identicalBookingTimestamp.toISOString()}`
      );
    }

    // Verify identical booking histories were created
    const bookingHistories = await prisma.booking.findMany({
      where: {
        userId: { in: teamMembers.map((m) => m.id) },
        createdAt: identicalBookingTimestamp,
      },
      select: { userId: true, createdAt: true },
    });
    console.log(`📈 Verified ${bookingHistories.length} identical booking histories created`);

    // Also create some ADDITIONAL recent bookings to make users truly equal in round-robin history
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const midMonthTimestamp = new Date(currentMonthStart.getTime() + 15 * 24 * 60 * 60 * 1000); // Mid month

    for (const member of teamMembers) {
      await prisma.booking.create({
        data: {
          uid: `recent-booking-${member.id}-${Date.now()}`,
          title: "Recent booking for identical history",
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
          eventTypeId: teamEvent.id,
          userId: member.id,
          status: "ACCEPTED",
          createdAt: midMonthTimestamp, // SAME timestamp for all users!
          updatedAt: midMonthTimestamp,
          attendees: {
            create: {
              email: "recent@example.com",
              name: "Recent Attendee",
              timeZone: "UTC",
            },
          },
        },
      });
    }
    console.log(
      `📈 Created additional recent bookings with identical timestamp ${midMonthTimestamp.toISOString()}`
    );

    // Get credentials with their IDs for cache population
    const credentials = await prisma.credential.findMany({
      where: {
        userId: { in: teamMembers.map((m) => m.id) },
        type: "google_calendar",
      },
    });

    // Define the time slot for our test (tomorrow at 10 AM)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const testTimeSlot = {
      timeMin: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        0,
        0,
        0
      ).toISOString(),
      timeMax: new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        23,
        59,
        59
      ).toISOString(),
    };

    // Populate stale calendar cache for both team members
    // This simulates a scenario where the cache shows hosts as available
    // but the real calendar might actually be busy
    const calendarCacheRepo = new CalendarCacheRepository(null);

    for (let i = 0; i < credentials.length; i++) {
      const credential = credentials[i];
      const member = teamMembers[i];

      const cacheArgs = {
        timeMin: testTimeSlot.timeMin,
        timeMax: testTimeSlot.timeMax,
        items: [{ id: member.email! }],
      };

      // Populate cache with stale data showing host as available (empty busy times)
      const staleAvailabilityData = {
        kind: "calendar#freeBusy",
        calendars: {
          [member.email!]: {
            busy: [], // Empty busy array = host appears available
          },
        },
      };

      await calendarCacheRepo.upsertCachedAvailability({
        credentialId: credential.id,
        userId: member.id,
        args: cacheArgs,
        value: staleAvailabilityData,
      });

      console.log(`📅 Populated stale cache for ${member.email} (credentialId: ${credential.id})`);
    }

    console.log("✅ Populated stale calendar cache for all team members");

    // Debug: Check what's actually in the cache
    const cacheEntries = await prisma.calendarCache.findMany({
      where: {
        credentialId: { in: credentials.map((c) => c.id) },
      },
    });
    console.log("💾 Cache entries in database:", cacheEntries.length);
    cacheEntries.forEach((entry, i) => {
      console.log(`Cache ${i + 1}:`, {
        credentialId: entry.credentialId,
        key: entry.key,
        value: JSON.stringify(entry.value),
        expiresAt: entry.expiresAt,
      });
    });

    await prisma.teamFeatures.createMany({
      data: [
        {
          teamId: team.id,
          featureId: "calendar-cache",
          assignedAt: new Date(),
          assignedBy: "race-condition-test",
        },
        {
          teamId: team.id,
          featureId: "calendar-cache-serve",
          assignedAt: new Date(),
          assignedBy: "race-condition-test",
        },
      ],
    });

    let firstBookingResponse: any;
    let secondBookingResponse: any;

    await doOnOrgDomain(
      {
        orgSlug: org.slug,
        page,
      },
      async () => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Apply Google Calendar API mocking to both contexts
        await mockGoogleCalendarAPI(page1);
        await mockGoogleCalendarAPI(page2);

        await page1.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);
        await page2.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);

        // Navigate to the specific day we have cached data for (tomorrow)
        const targetDay = tomorrow.getDate().toString();

        // Find and click the target day in both contexts using exact text match
        await page1
          .locator(`[data-testid="day"][data-disabled="false"]`)
          .filter({ hasText: new RegExp(`^${targetDay}$`) })
          .click();
        await page2
          .locator(`[data-testid="day"][data-disabled="false"]`)
          .filter({ hasText: new RegExp(`^${targetDay}$`) })
          .click();

        await page1.locator('[data-testid="time"]').nth(0).waitFor();
        await page2.locator('[data-testid="time"]').nth(0).waitFor();

        await page1.locator('[data-testid="time"]').nth(0).click();
        await page2.locator('[data-testid="time"]').nth(0).click();

        const bookingPromise1 = page1.waitForResponse(
          (response) => response.url().includes("/api/book/event") && response.status() === 200
        );
        const bookingPromise2 = page2.waitForResponse(
          (response) => response.url().includes("/api/book/event") && response.status() === 200
        );

        const bookingPromise1Start = bookTimeSlot(page1, {
          name: "Guest A",
          email: "guest-a@test.com",
        });

        await page.waitForTimeout(1500);

        const bookingPromise2Start = bookTimeSlot(page2, {
          name: "Guest B",
          email: "guest-b@test.com",
        });

        await Promise.all([bookingPromise1Start, bookingPromise2Start]);

        [firstBookingResponse, secondBookingResponse] = await Promise.all([bookingPromise1, bookingPromise2]);

        expect(firstBookingResponse.status()).toBe(200);
        expect(secondBookingResponse.status()).toBe(200);

        await expect(page1.getByTestId("success-page")).toBeVisible();
        await expect(page2.getByTestId("success-page")).toBeVisible();

        await context1.close();
        await context2.close();
      }
    );

    const bookings = await prisma.booking.findMany({
      where: {
        eventTypeId: teamEvent.id,
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

    expect(bookings).toHaveLength(2);

    const firstBookingTime = bookings[0].startTime;
    const secondBookingTime = bookings[1].startTime;
    expect(firstBookingTime.getTime()).toBe(secondBookingTime.getTime());

    const firstBookingHost = bookings[0].userId;
    const secondBookingHost = bookings[1].userId;

    const sameTimeslot = firstBookingTime.getTime() === secondBookingTime.getTime();
    const sameHost = firstBookingHost === secondBookingHost;

    console.log("Booking results analysis:", {
      sameTimeslot,
      sameHost,
      host1: firstBookingHost,
      host2: secondBookingHost,
      timeslot: firstBookingTime.toISOString(),
    });

    console.log("Bookings created:", {
      bookings: bookings.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        hostId: b.userId,
        attendeeEmail: b.attendees[0]?.email,
      })),
    });

    if (sameHost) {
      console.log("🎯 RACE CONDITION REPRODUCED - Same host got both bookings!");
    } else {
      console.log("❌ Round-robin working correctly - Different hosts selected");
      console.log("❗ Race condition NOT reproduced - need to investigate further");
    }

    // Basic assertions
    expect(sameTimeslot).toBe(true);

    // Race condition assertion - currently this should fail until we fix the race condition trigger
    // The race condition bug means SAME host gets both bookings (not different hosts)
    expect(sameHost).toBe(true);
  });
});
