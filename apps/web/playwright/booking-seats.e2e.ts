import { expect } from "@playwright/test";
import type { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import type { Fixtures } from "./lib/fixtures";
import { test } from "./lib/fixtures";
import { testBothBookers } from "./lib/new-booker";
import {
  bookTimeSlot,
  createNewSeatedEventType,
  selectFirstAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

async function createUserWithSeatedEvent(users: Fixtures["users"]) {
  const slug = "seats";
  const user = await users.create({
    eventTypes: [
      { title: "Seated event", slug, seatsPerTimeSlot: 10, requiresConfirmation: true, length: 30 },
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const eventType = user.eventTypes.find((e) => e.slug === slug)!;
  return { user, eventType };
}

async function createUserWithSeatedEventAndAttendees(
  fixtures: Pick<Fixtures, "users" | "bookings">,
  attendees: Prisma.AttendeeCreateManyBookingInput[]
) {
  const { user, eventType } = await createUserWithSeatedEvent(fixtures.users);
  const booking = await fixtures.bookings.create(user.id, user.username, eventType.id, {
    status: BookingStatus.ACCEPTED,
    // startTime with 1 day from now and endTime half hour after
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
    attendees: {
      createMany: {
        data: attendees,
      },
    },
  });
  return { user, eventType, booking };
}

testBothBookers.describe("Booking with Seats", (bookerVariant) => {
  test("User can create a seated event (2 seats as example)", async ({ users, page }) => {
    const user = await users.create({ name: "Seated event" });
    await user.login();
    const eventTitle = "My 2-seated event";
    await createNewSeatedEventType(page, { eventTitle });
    await expect(page.locator(`text=${eventTitle} event type updated successfully`)).toBeVisible();
  });
  test("Multiple Attendees can book a seated event time slot", async ({ users, page }) => {
    const slug = "my-2-seated-event";
    const user = await users.create({
      name: "Seated event user",
      eventTypes: [
        { title: "My 2-seated event", slug, length: 60, seatsPerTimeSlot: 2, seatsShowAttendees: true },
      ],
    });
    await page.goto(`/${user.username}/${slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Kept in if statement here, since it's only temporary
    // until the old booker isn't used anymore, and I wanted
    // to change the test as little as possible.
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (bookerVariant === "old-booker") {
      await page.waitForNavigation({
        url(url) {
          return url.pathname.endsWith("/book");
        },
      });
    }

    const bookingUrl = page.url();
    await test.step("Attendee #1 can book a seated event time slot", async () => {
      await page.goto(bookingUrl);
      await bookTimeSlot(page);
      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    });
    await test.step("Attendee #2 can book the same seated event time slot", async () => {
      await page.goto(bookingUrl);
      await bookTimeSlot(page, { email: "jane.doe@example.com", name: "Jane Doe" });
      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    });
    await test.step("Attendee #3 cannot book the same seated event time slot", async () => {
      await page.goto(bookingUrl);
      await bookTimeSlot(page, { email: "rick@example.com", name: "Rick" });
      await expect(page.locator("[data-testid=success-page]")).toBeHidden();
    });
  });
  // TODO: Make E2E test: Attendee #1 should be able to cancel his booking
  // todo("Attendee #1 should be able to cancel his booking");
  // TODO: Make E2E test: Attendee #1 should be able to reschedule his booking
  // todo("Attendee #1 should be able to reschedule his booking");
  // TODO: Make E2E test: All attendees canceling should delete the booking for the User
  // todo("All attendees canceling should delete the booking for the User");

  testBothBookers.describe("Reschedule for booking with seats", () => {
    test("Should reschedule booking with seats", async ({ page, users, bookings }) => {
      const { booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
        { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
        { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
        { name: "John Third", email: "third+seats@cal.com", timeZone: "Europe/Berlin" },
      ]);
      const bookingAttendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        select: {
          id: true,
        },
      });

      const bookingSeats = [
        { bookingId: booking.id, attendeeId: bookingAttendees[0].id, referenceUid: uuidv4() },
        { bookingId: booking.id, attendeeId: bookingAttendees[1].id, referenceUid: uuidv4() },
        { bookingId: booking.id, attendeeId: bookingAttendees[2].id, referenceUid: uuidv4() },
      ];

      await prisma.bookingSeat.createMany({
        data: bookingSeats,
      });

      const references = await prisma.bookingSeat.findMany({
        where: { bookingId: booking.id },
      });

      await page.goto(`/reschedule/${references[2].referenceUid}`);

      await selectFirstAvailableTimeSlotNextMonth(page);

      // expect input to be filled with attendee number 3 data
      const thirdAttendeeElement = await page.locator("input[name=name]");
      const attendeeName = await thirdAttendeeElement.inputValue();
      expect(attendeeName).toBe("John Third");

      await page.locator('[data-testid="confirm-reschedule-button"]').click();

      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/.*booking/);

      // Should expect old booking to be accepted with two attendees
      const oldBooking = await prisma.booking.findFirst({
        where: { uid: booking.uid },
        include: { seatsReferences: true, attendees: true },
      });

      expect(oldBooking?.status).toBe(BookingStatus.ACCEPTED);
      expect(oldBooking?.attendees.length).toBe(2);
      expect(oldBooking?.seatsReferences.length).toBe(2);
    });

    test("Should reschedule booking with seats and if everyone rescheduled it should be deleted", async ({
      page,
      users,
      bookings,
    }) => {
      const { booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
        { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
        { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      ]);

      const bookingAttendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        select: {
          id: true,
        },
      });

      const bookingSeats = [
        { bookingId: booking.id, attendeeId: bookingAttendees[0].id, referenceUid: uuidv4() },
        { bookingId: booking.id, attendeeId: bookingAttendees[1].id, referenceUid: uuidv4() },
      ];

      await prisma.bookingSeat.createMany({
        data: bookingSeats,
      });

      const references = await prisma.bookingSeat.findMany({
        where: { bookingId: booking.id },
      });

      await page.goto(`/reschedule/${references[0].referenceUid}`);

      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.locator('[data-testid="confirm-reschedule-button"]').click();

      await page.waitForNavigation({ url: /.*booking/ });

      await page.goto(`/reschedule/${references[1].referenceUid}`);

      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.locator('[data-testid="confirm-reschedule-button"]').click();

      await page.waitForNavigation({ url: /.*booking/ });

      // Should expect old booking to be cancelled
      const oldBooking = await prisma.booking.findFirst({
        where: { uid: booking.uid },
        include: {
          seatsReferences: true,
          attendees: true,
          eventType: {
            include: { users: true, hosts: true },
          },
        },
      });

      expect(oldBooking?.status).toBe(BookingStatus.CANCELLED);
    });

    test("Should cancel with seats and have no attendees and cancelled", async ({
      page,
      users,
      bookings,
    }) => {
      const { user, booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
        { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
        { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      ]);
      await user.login();

      const oldBooking = await prisma.booking.findFirst({
        where: { uid: booking.uid },
        include: { seatsReferences: true, attendees: true },
      });

      const bookingAttendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        select: {
          id: true,
        },
      });

      const bookingSeats = [
        { bookingId: booking.id, attendeeId: bookingAttendees[0].id, referenceUid: uuidv4() },
        { bookingId: booking.id, attendeeId: bookingAttendees[1].id, referenceUid: uuidv4() },
      ];

      await prisma.bookingSeat.createMany({
        data: bookingSeats,
      });

      // Now we cancel the booking as the organizer
      await page.goto(`/booking/${booking.uid}?cancel=true`);

      await page.locator('[data-testid="cancel"]').click();

      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/.*booking/);

      // Should expect old booking to be cancelled
      const updatedBooking = await prisma.booking.findFirst({
        where: { uid: booking.uid },
        include: { seatsReferences: true, attendees: true },
      });

      expect(oldBooking?.startTime).not.toBe(updatedBooking?.startTime);
    });

    test("If rescheduled/cancelled booking with seats it should display the correct number of seats", async ({
      page,
      users,
      bookings,
    }) => {
      const { booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
        { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
        { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      ]);

      const bookingAttendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        select: {
          id: true,
        },
      });

      const bookingSeats = [
        { bookingId: booking.id, attendeeId: bookingAttendees[0].id, referenceUid: uuidv4() },
        { bookingId: booking.id, attendeeId: bookingAttendees[1].id, referenceUid: uuidv4() },
      ];

      await prisma.bookingSeat.createMany({
        data: bookingSeats,
      });

      const references = await prisma.bookingSeat.findMany({
        where: { bookingId: booking.id },
      });

      await page.goto(
        `/booking/${references[0].referenceUid}?cancel=true&seatReferenceUid=${references[0].referenceUid}`
      );

      await page.locator('[data-testid="cancel"]').click();

      const oldBooking = await prisma.booking.findFirst({
        where: { uid: booking.uid },
        select: {
          id: true,
          status: true,
        },
      });

      expect(oldBooking?.status).toBe(BookingStatus.ACCEPTED);

      await page.goto(`/reschedule/${references[1].referenceUid}`);

      await page.click('[data-testid="incrementMonth"]');

      await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();

      // Validate that the number of seats its 10
      expect(await page.locator("text=9 / 10 Seats available").count()).toEqual(0);
    });

    test("Should cancel with seats but event should be still accesible and with one less attendee/seat", async ({
      page,
      users,
      bookings,
    }) => {
      const { user, booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
        { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
        { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      ]);
      await user.login();

      const bookingAttendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        select: {
          id: true,
        },
      });

      const bookingSeats = [
        { bookingId: booking.id, attendeeId: bookingAttendees[0].id, referenceUid: uuidv4() },
        { bookingId: booking.id, attendeeId: bookingAttendees[1].id, referenceUid: uuidv4() },
      ];

      await prisma.bookingSeat.createMany({
        data: bookingSeats,
      });

      // Now we cancel the booking as the first attendee
      // booking/${bookingUid}?cancel=true&allRemainingBookings=false&seatReferenceUid={bookingSeat.referenceUid}
      await page.goto(
        `/booking/${booking.uid}?cancel=true&allRemainingBookings=false&seatReferenceUid=${bookingSeats[0].referenceUid}`
      );

      await page.locator('[data-testid="cancel"]').click();

      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/.*booking/);

      await page.goto(
        `/booking/${booking.uid}?cancel=true&allRemainingBookings=false&seatReferenceUid=${bookingSeats[1].referenceUid}`
      );

      // Page should not be 404
      await page.locator('[data-testid="cancel"]').click();

      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/.*booking/);
    });

    test("Should book with seats and hide attendees info from showAttendees true", async ({
      page,
      users,
      bookings,
    }) => {
      const { user, booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
        { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
        { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      ]);
      await user.login();
      const bookingWithEventType = await prisma.booking.findFirst({
        where: { uid: booking.uid },
        select: {
          id: true,
          eventTypeId: true,
        },
      });

      await prisma.eventType.update({
        data: {
          seatsShowAttendees: false,
        },
        where: {
          id: bookingWithEventType?.eventTypeId || -1,
        },
      });

      const bookingAttendees = await prisma.attendee.findMany({
        where: { bookingId: booking.id },
        select: {
          id: true,
        },
      });

      const bookingSeats = [
        { bookingId: booking.id, attendeeId: bookingAttendees[0].id, referenceUid: uuidv4() },
        { bookingId: booking.id, attendeeId: bookingAttendees[1].id, referenceUid: uuidv4() },
      ];

      await prisma.bookingSeat.createMany({
        data: bookingSeats,
      });

      // Go to cancel page and see that attendees are listed and myself as I'm owner of the booking
      await page.goto(`/booking/${booking.uid}?cancel=true&allRemainingBookings=false`);

      const foundFirstAttendeeAsOwner = await page.locator('p[data-testid="attendee-first+seats@cal.com"]');
      await expect(foundFirstAttendeeAsOwner).toHaveCount(1);
      const foundSecondAttendeeAsOwner = await page.locator('p[data-testid="attendee-second+seats@cal.com"]');
      await expect(foundSecondAttendeeAsOwner).toHaveCount(1);
      await page.pause();
      await page.goto("auth/logout");

      // Now we cancel the booking as the first attendee
      // booking/${bookingUid}?cancel=true&allRemainingBookings=false&seatReferenceUid={bookingSeat.referenceUid}
      await page.goto(
        `/booking/${booking.uid}?cancel=true&allRemainingBookings=false&seatReferenceUid=${bookingSeats[0].referenceUid}`
      );

      // No attendees should be displayed only the one that it's cancelling
      const notFoundSecondAttendee = await page.locator('p[data-testid="attendee-second+seats@cal.com"]');

      await expect(notFoundSecondAttendee).toHaveCount(0);
      const foundFirstAttendee = await page.locator('p[data-testid="attendee-first+seats@cal.com"]');
      await expect(foundFirstAttendee).toHaveCount(1);

      await prisma.eventType.update({
        data: {
          seatsShowAttendees: true,
        },
        where: {
          id: bookingWithEventType?.eventTypeId || -1,
        },
      });

      await page.goto(
        `/booking/${booking.uid}?cancel=true&allRemainingBookings=false&seatReferenceUid=${bookingSeats[1].referenceUid}`
      );

      // Now attendees should be displayed
      const foundSecondAttendee = await page.locator('p[data-testid="attendee-second+seats@cal.com"]');

      await expect(foundSecondAttendee).toHaveCount(1);
      const foundFirstAttendeeAgain = await page
        .locator('p[data-testid="attendee-first+seats@cal.com"]')
        .first();
      await expect(foundFirstAttendeeAgain).toHaveCount(1);
    });
  });
});
