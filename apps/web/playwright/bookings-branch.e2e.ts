import { expect } from "@playwright/test";

import { BookingStatus } from "@calcom/prisma/client";

import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Bookings - Using Storage State", () => {
  test("show attendee bookings and organizer bookings in asc order by startDate", async ({
    page,
    users,
    bookings,
  }) => {
    const firstUser = await users.create();
    const secondUser = await users.create();

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

    const upcomingBookings = page.locator('[data-testid="upcoming-bookings"]');
    const firstUpcomingBooking = upcomingBookings.locator('[data-testid="booking-item"]').nth(0);
    const secondUpcomingBooking = upcomingBookings.locator('[data-testid="booking-item"]').nth(1);

    await expect(
      firstUpcomingBooking.locator(`text=${bookingWhereFirstUserIsAttendee?.title}`)
    ).toBeVisible();
    await expect(
      secondUpcomingBooking.locator(`text=${bookingWhereFirstUserIsOrganizer?.title}`)
    ).toBeVisible();
  });
});

async function createBooking({
  title,
  bookingsFixture,
  relativeDate,
  organizer,
  organizerEventType,
  attendees,
}: {
  title: string;
  bookingsFixture: Fixtures["bookings"];
  relativeDate: number;
  organizer: { id: number; username: string | null; email: string };
  organizerEventType: { id: number };
  attendees: Array<{ name: string; email: string; timeZone: string }>;
}) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + relativeDate);

  return await bookingsFixture.create(organizer.id, organizer.username, organizerEventType.id, {
    title,
    startTime: startDate,
    endTime: new Date(startDate.getTime() + 30 * 60 * 1000),
    status: BookingStatus.ACCEPTED,
    attendees: {
      createMany: {
        data: attendees,
      },
    },
  });
}
