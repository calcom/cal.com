import { expect } from "@playwright/test";

import { BookingStatus } from "@calcom/prisma/client";

import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";
import { setupManagedEvent } from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Bookings", () => {
  test.describe("Upcoming bookings", () => {
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
        // Create a booking 3 days from today
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
        // Booking created 2 days from today
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
      const upcomingBookings = page.locator('[data-testid="upcoming-bookings"]');
      const firstUpcomingBooking = upcomingBookings.locator('[data-testid="booking-item"]').nth(0);
      const secondUpcomingBooking = upcomingBookings.locator('[data-testid="booking-item"]').nth(1);
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        firstUpcomingBooking.locator(`text=${bookingWhereFirstUserIsAttendee!.title}`)
      ).toBeVisible();
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        secondUpcomingBooking.locator(`text=${bookingWhereFirstUserIsOrganizer!.title}`)
      ).toBeVisible();
    });
  });
  test.describe("Past bookings", () => {
    test("Mark first guest as no-show", async ({ page, users, bookings, webhooks }) => {
      const firstUser = await users.create();
      const secondUser = await users.create();

      const bookingWhereFirstUserIsOrganizerFixture = await createBooking({
        title: "Booking as organizer",
        bookingsFixture: bookings,
        // Create a booking 3 days ago
        relativeDate: -3,
        organizer: firstUser,
        organizerEventType: firstUser.eventTypes[0],
        attendees: [
          { name: "First", email: "first@cal.com", timeZone: "Europe/Berlin" },
          { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      const bookingWhereFirstUserIsOrganizer = await bookingWhereFirstUserIsOrganizerFixture.self();
      await firstUser.apiLogin();
      const webhookReceiver = await webhooks.createReceiver();
      await page.goto(`/bookings/past`);
      const pastBookings = page.locator('[data-testid="past-bookings"]');
      const firstPastBooking = pastBookings.locator('[data-testid="booking-item"]').nth(0);
      const titleAndAttendees = firstPastBooking.locator('[data-testid="title-and-attendees"]');
      const firstGuest = firstPastBooking.locator('[data-testid="guest"]').nth(0);
      await firstGuest.click();
      await expect(titleAndAttendees.locator('[data-testid="unmark-no-show"]')).toBeHidden();
      await expect(titleAndAttendees.locator('[data-testid="mark-no-show"]')).toBeVisible();
      await titleAndAttendees.locator('[data-testid="mark-no-show"]').click();
      await firstGuest.click();
      await expect(titleAndAttendees.locator('[data-testid="unmark-no-show"]')).toBeVisible();
      await expect(titleAndAttendees.locator('[data-testid="mark-no-show"]')).toBeHidden();
      await webhookReceiver.waitForRequestCount(1);
      const [request] = webhookReceiver.requestList;
      const body = request.body;
      // remove dynamic properties that differs depending on where you run the tests
      const dynamic = "[redacted/dynamic]";
      // @ts-expect-error we are modifying the object
      body.createdAt = dynamic;
      expect(body).toMatchObject({
        triggerEvent: "BOOKING_NO_SHOW_UPDATED",
        createdAt: "[redacted/dynamic]",
        payload: {
          message: "first@cal.com marked as no-show",
          attendees: [{ email: "first@cal.com", noShow: true }],
          bookingUid: bookingWhereFirstUserIsOrganizer?.uid,
          bookingId: bookingWhereFirstUserIsOrganizer?.id,
        },
      });
      webhookReceiver.close();
    });
    test("Mark 3rd attendee as no-show", async ({ page, users, bookings }) => {
      const firstUser = await users.create();
      const secondUser = await users.create();

      const bookingWhereFirstUserIsOrganizerFixture = await createBooking({
        title: "Booking as organizer",
        bookingsFixture: bookings,
        // Create a booking 4 days ago
        relativeDate: -4,
        organizer: firstUser,
        organizerEventType: firstUser.eventTypes[0],
        attendees: [
          { name: "First", email: "first@cal.com", timeZone: "Europe/Berlin" },
          { name: "Second", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third", email: "third@cal.com", timeZone: "Europe/Berlin" },
          { name: "Fourth", email: "fourth@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      const bookingWhereFirstUserIsOrganizer = await bookingWhereFirstUserIsOrganizerFixture.self();

      await firstUser.apiLogin();
      await page.goto(`/bookings/past`);
      const pastBookings = page.locator('[data-testid="past-bookings"]');
      const firstPastBooking = pastBookings.locator('[data-testid="booking-item"]').nth(0);
      const titleAndAttendees = firstPastBooking.locator('[data-testid="title-and-attendees"]');
      const moreGuests = firstPastBooking.locator('[data-testid="more-guests"]');
      await moreGuests.click();
      const firstGuestInMore = page.getByRole("menuitemcheckbox").nth(0);
      await expect(firstGuestInMore).toBeChecked({ checked: false });
      await firstGuestInMore.click();
      await expect(firstGuestInMore).toBeChecked({ checked: true });
      const updateNoShow = firstPastBooking.locator('[data-testid="update-no-show"]');
      await updateNoShow.click();
      await moreGuests.click();
      await expect(firstGuestInMore).toBeChecked({ checked: true });
    });
    test("Team admin/owner can mark first attendee as no-show", async ({
      page,
      users,
      bookings,
      webhooks,
    }) => {
      const { adminUser, memberUser, managedEvent } = await setupManagedEvent({ users });

      const bookingFixture = await createBooking({
        title: "Managed Event Booking",
        bookingsFixture: bookings,
        // Create a booking 3 days ago
        relativeDate: -3,
        organizer: memberUser,
        organizerEventType: managedEvent,
        attendees: [
          { name: "First Guest", email: "first@cal.com", timeZone: "Europe/Berlin" },
          { name: "Second Guest", email: "second@cal.com", timeZone: "Europe/Berlin" },
          { name: "Third Guest", email: "third@cal.com", timeZone: "Europe/Berlin" },
        ],
      });
      const booking = await bookingFixture.self();
      await adminUser.apiLogin();
      const { webhookReceiver, teamId } = await webhooks.createTeamReceiver();
      await page.goto(`/bookings/past`);
      const pastBookings = page.locator('[data-testid="past-bookings"]');
      const firstPastBooking = pastBookings.locator('[data-testid="booking-item"]').nth(0);
      const titleAndAttendees = firstPastBooking.locator('[data-testid="title-and-attendees"]');
      const firstGuest = firstPastBooking.locator('[data-testid="guest"]').nth(0);
      await firstGuest.click();
      await expect(titleAndAttendees.locator('[data-testid="mark-no-show"]')).toBeVisible();
      await titleAndAttendees.locator('[data-testid="mark-no-show"]').click();
      await firstGuest.click();
      await expect(titleAndAttendees.locator('[data-testid="unmark-no-show"]')).toBeVisible();
      await expect(titleAndAttendees.locator('[data-testid="mark-no-show"]')).toBeHidden();
      await webhookReceiver.waitForRequestCount(1);
      const [request] = webhookReceiver.requestList;
      const body = request.body;
      const dynamic = "[redacted/dynamic]";
      // @ts-expect-error we are modifying the object
      body.createdAt = dynamic;
      expect(body).toMatchObject({
        triggerEvent: "BOOKING_NO_SHOW_UPDATED",
        createdAt: "[redacted/dynamic]",
        payload: {
          message: "first@cal.com marked as no-show",
          attendees: [{ email: "first@cal.com", noShow: true }],
          bookingUid: booking?.uid,
          bookingId: booking?.id,
        },
      });

      // Close webhook receiver
      webhookReceiver.close();
    });
  });
});

async function createBooking({
  bookingsFixture,
  organizer,
  organizerEventType,
  attendees,
  /**
   * Relative date from today
   * -1 means yesterday
   * 0 means today
   * 1 means tomorrow
   */
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
