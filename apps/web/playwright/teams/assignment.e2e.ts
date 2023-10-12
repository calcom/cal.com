import { expect } from "@playwright/test";

import { SchedulingType } from "@calcom/prisma/enums";

import { test } from "../lib/fixtures";
import { bookTimeSlot, selectFirstAvailableTimeSlotNextMonth, testName, todo } from "../lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Team Assignment (Round Robin / Collective / ...)", () => {
  test("Can create a booking for Collective EventType", async ({ page, users }) => {
    const ownerObj = { username: "pro-user", name: "pro-user" };
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];

    const owner = await users.create(ownerObj, {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.COLLECTIVE,
    });
    const { team } = await owner.getTeam();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    await page.goto(`/team/${team.slug}/${teamEventSlug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // The title of the booking
    const BookingTitle = `${teamEventTitle} between ${team.name} and ${testName}`;
    await expect(page.locator("[data-testid=booking-title]")).toHaveText(BookingTitle);
    // The booker should be in the attendee list
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    // All the teammates should be in the booking
    for (const teammate of teamMatesObj) {
      await expect(page.getByText(teammate.name, { exact: true })).toBeVisible();
    }

    // TODO: Assert whether the user received an email
  });
  test("Can create a booking for Round Robin EventType", async ({ page, users }) => {
    const ownerObj = { username: "pro-user", name: "pro-user" };
    const teamMatesObj = [
      { name: "teammate-1" },
      { name: "teammate-2" },
      { name: "teammate-3" },
      { name: "teammate-4" },
    ];
    const owner = await users.create(ownerObj, {
      hasTeam: true,
      teammates: teamMatesObj,
      schedulingType: SchedulingType.ROUND_ROBIN,
    });

    const { team } = await owner.getTeam();
    const { title: teamEventTitle, slug: teamEventSlug } = await owner.getFirstTeamEvent(team.id);

    await page.goto(`/team/${team.slug}/${teamEventSlug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // The person who booked the meeting should be in the attendee list
    await expect(page.locator(`[data-testid="attendee-name-${testName}"]`)).toHaveText(testName);

    // The title of the booking
    const BookingTitle = `${teamEventTitle} between ${team.name} and ${testName}`;
    await expect(page.locator("[data-testid=booking-title]")).toHaveText(BookingTitle);

    // Since all the users have the same leastRecentlyBooked value
    // Anyone of the teammates could be the Host of the booking.
    const chosenUser = await page.getByTestId("booking-host-name").textContent();
    expect(chosenUser).not.toBeNull();
    expect(teamMatesObj.some(({ name }) => name === chosenUser)).toBe(true);
    // TODO: Assert whether the user received an email
  });

  todo("Create a Round Robin with different leastRecentlyBooked hosts");
  todo("Reschedule a Collective EventType booking");
  todo("Reschedule a Round Robin EventType booking");
});
