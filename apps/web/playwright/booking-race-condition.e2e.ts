import { expect } from "@playwright/test";

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

        await page1.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);
        await page2.goto(`/org/${org.slug}/${team.slug}/${teamEvent.slug}`);

        await page1.getByTestId("incrementMonth").click();
        await page2.getByTestId("incrementMonth").click();

        await page1.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();
        await page2.locator('[data-testid="day"][data-disabled="false"]').nth(0).waitFor();

        await page1.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();
        await page2.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();

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

    console.log("Race condition successfully reproduced - both bookings created for same timeslot:", {
      sameTimeslot: firstBookingTime.getTime() === secondBookingTime.getTime(),
      host1: firstBookingHost,
      host2: secondBookingHost,
      timeslot: firstBookingTime.toISOString(),
    });

    console.log("Race condition reproduced:", {
      bookings: bookings.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        hostId: b.userId,
        attendeeEmail: b.attendees[0]?.email,
      })),
    });
  });
});
