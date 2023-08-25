import { expect } from "@playwright/test";

import { BookingStatus } from "@calcom/prisma/client";

import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Bookings", () => {
  test.only("Upcoming bookings", async ({ page, users, bookings }) => {
    const firstUser = await users.create();
    const secondUser = await users.create();
    const firstEventType = firstUser.eventTypes[0];

    const bookingWhereFirstUserIsOrganizerFixture = await createBooking({
      title: "Booking as organizer",
      bookingsFixture: bookings,
      relativeDate: 3,
      organizer: firstUser,
      organizerEventType: firstUser.eventTypes[0],
      attendees: [
        { name: "First", email: "first@cal.com", timeZone: "Europe/Berlin" },
        { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
        { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
      ],
    });
    const bookingWhereFirstUserIsOrganizer = await bookingWhereFirstUserIsOrganizerFixture.self();

    const bookingWhereFirstUserIsAttendeeFixture = await createBooking({
      title: "Booking as attendee",
      bookingsFixture: bookings,
      organizer: secondUser,
      relativeDate: 2,
      organizerEventType: secondUser.eventTypes[0],
      attendees: [
        { name: "OrganizerAsBooker", email: firstUser.email, timeZone: "Europe/Berlin" },
        { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
        { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
      ],
    });
    const bookingWhereFirstUserIsAttendee = await bookingWhereFirstUserIsAttendeeFixture.self();

    await firstUser.apiLogin();
    await page.goto(`/bookings/upcoming`);
    const firstUpcomingBooking = page
      .locator('[data-testid="upcoming-bookings"] [data-testid="booking-item"]')
      .nth(0);
    const secondUpcomingBooking = page
      .locator('[data-testid="upcoming-bookings"] [data-testid="booking-item"]')
      .nth(1);
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      firstUpcomingBooking.locator(`text=${bookingWhereFirstUserIsAttendee!.title}`)
    ).toBeVisible();
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      secondUpcomingBooking.locator(`text=${bookingWhereFirstUserIsOrganizer!.title}`)
    ).toBeVisible();

    await page.pause();
  });
});

async function createBooking({
  bookingsFixture,
  organizer,
  organizerEventType,
  attendees,
  relativeDate = 0,
  durationMins = 30,
  title,
}: {
  bookingsFixture: Fixtures["bookings"];
  organizer: {
    id: number;
    username: string | null;
  };
  organizerEventType: {
    id: number;
  };
  attendees: {
    name: string;
    email: string;
    timeZone: string;
  }[];
  relativeDate?: number;
  durationMins?: number;
  title: string;
}) {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const bookingDurationMs = durationMins * 60 * 1000;
  const startTime = new Date(Date.now() + relativeDate * DAY_MS);
  const endTime = new Date(Date.now() + relativeDate * DAY_MS + bookingDurationMs);
  return await bookingsFixture.create(organizer.id, organizer.username, organizerEventType.id, {
    title,
    status: BookingStatus.ACCEPTED,
    startTime,
    endTime,
    attendees: {
      createMany: {
        data: [...attendees],
      },
    },
  });
}
