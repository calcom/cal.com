import { expect } from "@playwright/test";
import { v4 as uuidv4 } from "uuid";

import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import {
  createNewSeatedEventType,
  selectFirstAvailableTimeSlotNextMonth,
  createUserWithSeatedEventAndAttendees,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });
test.afterEach(({ users }) => users.deleteAll());

test.describe("Booking with Seats", () => {
  test("User can create a seated event (2 seats as example)", async ({ users, page }) => {
    const user = await users.create({ name: "Seated event" });
    await user.apiLogin();
    await page.goto("/event-types");
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    const eventTitle = "My 2-seated event";
    await createNewSeatedEventType(page, { eventTitle });
    await expect(page.locator(`text=Event type updated successfully`)).toBeVisible();
  });

  test(`Prevent attendees from cancel when having invalid URL params`, async ({ page, users, bookings }) => {
    const { booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "John Third", email: "third+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);

    const bookingAttendees = await prisma.attendee.findMany({
      where: { bookingId: booking.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const bookingSeats = bookingAttendees.map((attendee) => ({
      bookingId: booking.id,
      attendeeId: attendee.id,
      referenceUid: uuidv4(),
      data: {
        responses: {
          name: attendee.name,
          email: attendee.email,
        },
      },
    }));

    await prisma.bookingSeat.createMany({
      data: bookingSeats,
    });

    await test.step("Attendee #2 shouldn't be able to cancel booking using only booking/uid", async () => {
      await page.goto(`/booking/${booking.uid}`);

      await expect(page.locator("[text=Cancel]")).toHaveCount(0);
    });

    await test.step("Attendee #2 shouldn't be able to cancel booking using randomString for seatReferenceUId", async () => {
      await page.goto(`/booking/${booking.uid}?seatReferenceUid=${randomString(10)}`);

      // expect cancel button to don't be in the page
      await expect(page.locator("[text=Cancel]")).toHaveCount(0);
    });
  });

  test("Owner shouldn't be able to cancel booking without login in", async ({ page, bookings, users }) => {
    const { booking, user } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "John Third", email: "third+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);
    await page.goto(`/booking/${booking.uid}?cancel=true`);
    await expect(page.locator("[text=Cancel]")).toHaveCount(0);

    // expect login text to be in the page, not data-testid
    await expect(page.locator("text=Login")).toHaveCount(1);

    // click on login button text
    await page.locator("text=Login").click();

    // expect to be redirected to login page with query parameter callbackUrl
    await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=.*/);

    await user.apiLogin();

    // manual redirect to booking page
    await page.goto(`/booking/${booking.uid}?cancel=true`);

    // expect login button to don't be in the page
    await expect(page.locator("text=Login")).toHaveCount(0);

    // fill reason for cancellation
    await page.fill('[data-testid="cancel_reason"]', "Double booked!");

    // confirm cancellation
    await page.locator('[data-testid="confirm_cancel"]').click();
    await page.waitForLoadState("networkidle");

    const updatedBooking = await prisma.booking.findFirst({
      where: { id: booking.id },
    });

    expect(updatedBooking).not.toBeNull();
    expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
  });
});

test.describe("Reschedule for booking with seats", () => {
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
        name: true,
        email: true,
      },
    });

    const bookingSeats = bookingAttendees.map((attendee) => ({
      bookingId: booking.id,
      attendeeId: attendee.id,
      referenceUid: uuidv4(),
      data: {
        responses: {
          name: attendee.name,
          email: attendee.email,
        },
      },
    }));

    await prisma.bookingSeat.createMany({
      data: bookingSeats,
    });

    const references = await prisma.bookingSeat.findMany({
      where: { bookingId: booking.id },
    });

    await page.goto(
      `/booking/${references[0].referenceUid}?cancel=true&seatReferenceUid=${references[0].referenceUid}`
    );

    await page.locator('[data-testid="confirm_cancel"]').click();

    await page.waitForResponse((res) => res.url().includes("api/cancel") && res.status() === 200);

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

  test("Should cancel with seats but event should be still accessible and with one less attendee/seat", async ({
    page,
    users,
    bookings,
  }) => {
    const { user, booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);
    await user.apiLogin();

    const bookingAttendees = await prisma.attendee.findMany({
      where: { bookingId: booking.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const bookingSeats = bookingAttendees.map((attendee) => ({
      bookingId: booking.id,
      attendeeId: attendee.id,
      referenceUid: uuidv4(),
      data: {
        responses: {
          name: attendee.name,
          email: attendee.email,
        },
      },
    }));

    await prisma.bookingSeat.createMany({
      data: bookingSeats,
    });

    // Now we cancel the booking as the first attendee
    // booking/${bookingUid}?cancel=true&allRemainingBookings=false&seatReferenceUid={bookingSeat.referenceUid}
    await page.goto(
      `/booking/${booking.uid}?cancel=true&allRemainingBookings=false&seatReferenceUid=${bookingSeats[0].referenceUid}`
    );

    await page.locator('[data-testid="confirm_cancel"]').click();

    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/booking\/.*/);

    await page.goto(
      `/booking/${booking.uid}?cancel=true&allRemainingBookings=false&seatReferenceUid=${bookingSeats[1].referenceUid}`
    );

    // Page should not be 404
    await page.locator('[data-testid="confirm_cancel"]').click();

    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/booking\/.*/);
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
    await user.apiLogin();
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
        name: true,
        email: true,
      },
    });

    const bookingSeats = bookingAttendees.map((attendee) => ({
      bookingId: booking.id,
      attendeeId: attendee.id,
      referenceUid: uuidv4(),
      data: {
        responses: {
          name: attendee.name,
          email: attendee.email,
        },
      },
    }));

    await prisma.bookingSeat.createMany({
      data: bookingSeats,
    });

    // Go to cancel page and see that attendees are listed and myself as I'm owner of the booking
    await page.goto(`/booking/${booking.uid}?cancel=true&allRemainingBookings=false`);

    const foundFirstAttendeeAsOwner = await page.locator(
      'p[data-testid="attendee-email-first+seats@cal.com"]'
    );
    await expect(foundFirstAttendeeAsOwner).toHaveCount(1);
    const foundSecondAttendeeAsOwner = await page.locator(
      'p[data-testid="attendee-email-second+seats@cal.com"]'
    );
    await expect(foundSecondAttendeeAsOwner).toHaveCount(1);

    await page.goto("auth/logout");
    await page.getByTestId("logout-btn").click();
    await expect(page).toHaveURL(/login/);

    // Now we cancel the booking as the first attendee
    // booking/${bookingUid}?cancel=true&allRemainingBookings=false&seatReferenceUid={bookingSeat.referenceUid}
    await page.goto(
      `/booking/${booking.uid}?cancel=true&allRemainingBookings=false&seatReferenceUid=${bookingSeats[0].referenceUid}`
    );

    // No attendees should be displayed only the one that it's cancelling
    const notFoundSecondAttendee = await page.locator('p[data-testid="attendee-email-second+seats@cal.com"]');

    await expect(notFoundSecondAttendee).toHaveCount(0);
    const foundFirstAttendee = await page.locator('p[data-testid="attendee-email-first+seats@cal.com"]');
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
    const foundSecondAttendee = await page.locator('p[data-testid="attendee-email-second+seats@cal.com"]');

    await expect(foundSecondAttendee).toHaveCount(1);
    const foundFirstAttendeeAgain = await page
      .locator('p[data-testid="attendee-email-first+seats@cal.com"]')
      .first();
    await expect(foundFirstAttendeeAgain).toHaveCount(1);
  });

  test("Owner shouldn't be able to reschedule booking without login in", async ({
    page,
    bookings,
    users,
  }) => {
    const { booking, user } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "John Third", email: "third+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);
    const getBooking = await booking.self();

    await page.goto(`/booking/${booking.uid}`);
    await expect(page.locator('[data-testid="reschedule"]')).toHaveCount(0);

    // expect login text to be in the page, not data-testid
    await expect(page.locator("text=Login")).toHaveCount(1);

    // click on login button text
    await page.locator("text=Login").click();

    // expect to be redirected to login page with query parameter callbackUrl
    await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=.*/);

    await user.apiLogin();

    // manual redirect to booking page
    await page.goto(`/booking/${booking.uid}`);

    // expect login button to don't be in the page
    await expect(page.locator("text=Login")).toHaveCount(0);

    // reschedule-link click
    await page.locator('[data-testid="reschedule-link"]').click();

    await selectFirstAvailableTimeSlotNextMonth(page);

    // data displayed in form should be user owner
    const nameElement = await page.locator("input[name=name]");
    const name = await nameElement.inputValue();
    expect(name).toBe(user.name);

    //same for email
    const emailElement = await page.locator("input[name=email]");
    const email = await emailElement.inputValue();
    expect(email).toBe(user.email);

    // reason to reschedule input should be visible textfield with name rescheduleReason
    const reasonElement = await page.locator("textarea[name=rescheduleReason]");
    await expect(reasonElement).toBeVisible();

    // expect to be redirected to reschedule page
    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    // should wait for URL but that path starts with booking/
    await page.waitForURL(/\/booking\/.*/);

    await expect(page).toHaveURL(/\/booking\/.*/);

    await page.waitForLoadState("networkidle");

    const updatedBooking = await prisma.booking.findFirst({
      where: { id: booking.id },
    });

    expect(updatedBooking).not.toBeNull();
    expect(getBooking?.startTime).not.toBe(updatedBooking?.startTime);
    expect(getBooking?.endTime).not.toBe(updatedBooking?.endTime);
    expect(updatedBooking?.status).toBe(BookingStatus.ACCEPTED);
  });

  test("Owner shouldn't be able to reschedule when going directly to booking/rescheduleUid", async ({
    page,
    bookings,
    users,
  }) => {
    const { booking, user } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "John Third", email: "third+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);
    const getBooking = await booking.self();

    await page.goto(`/${user.username}/seats?rescheduleUid=${getBooking?.uid}&bookingUid=null`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    // expect textarea with name notes to be visible
    const notesElement = await page.locator("textarea[name=notes]");
    await expect(notesElement).toBeVisible();

    // expect button confirm instead of reschedule
    await expect(page.locator('[data-testid="confirm-book-button"]')).toHaveCount(1);

    // now login and try again
    await user.apiLogin();

    await page.goto(`/${user.username}/seats?rescheduleUid=${getBooking?.uid}&bookingUid=null`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await expect(page).toHaveTitle(/(?!.*reschedule).*/);

    // expect button reschedule
    await expect(page.locator('[data-testid="confirm-reschedule-button"]')).toHaveCount(1);
  });

  // @TODO: force 404 when rescheduleUid is not found
});
