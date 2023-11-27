import { expect } from "@playwright/test";
import { uuid } from "short-uuid";
import { v4 as uuidv4 } from "uuid";

import { randomString } from "@calcom/lib/random";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
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

  test("Multiple Attendees can book a seated event time slot", async ({ users, page }) => {
    const slug = "my-2-seated-event";
    const user = await users.create({
      name: "Seated event user",
      eventTypes: [
        {
          title: "My 2-seated event",
          slug,
          length: 60,
          seatsPerTimeSlot: 2,
          seatsShowAttendees: true,
        },
      ],
    });
    await page.goto(`/${user.username}/${slug}`);

    let bookingUrl = "";

    await test.step("Attendee #1 can book a seated event time slot", async () => {
      await selectFirstAvailableTimeSlotNextMonth(page);
      await bookTimeSlot(page);
      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    });
    await test.step("Attendee #2 can book the same seated event time slot", async () => {
      await page.goto(`/${user.username}/${slug}`);
      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.waitForURL(/bookingUid/);
      bookingUrl = page.url();
      await bookTimeSlot(page, { email: "jane.doe@example.com", name: "Jane Doe" });
      await expect(page.locator("[data-testid=success-page]")).toBeVisible();
    });
    await test.step("Attendee #3 cannot click on the same seated event time slot", async () => {
      await page.goto(`/${user.username}/${slug}`);

      await page.click('[data-testid="incrementMonth"]');

      // TODO: Find out why the first day is always booked on tests
      await page.locator('[data-testid="day"][data-disabled="false"]').nth(0).click();
      await expect(page.locator('[data-testid="time"][data-disabled="true"]')).toBeVisible();
    });
    await test.step("Attendee #3 cannot book the same seated event time slot accessing via url", async () => {
      await page.goto(bookingUrl);

      await bookTimeSlot(page, { email: "rick@example.com", name: "Rick" });
      await expect(page.locator("[data-testid=success-page]")).toBeHidden();
    });

    await test.step("User owner should have only 1 booking with 3 attendees", async () => {
      // Make sure user owner has only 1 booking with 3 attendees
      const bookings = await prisma.booking.findMany({
        where: { eventTypeId: user.eventTypes.find((e) => e.slug === slug)?.id },
        select: {
          id: true,
          attendees: {
            select: {
              id: true,
            },
          },
        },
      });

      expect(bookings).toHaveLength(1);
      expect(bookings[0].attendees).toHaveLength(2);
    });
  });

  test(`Attendees can cancel a seated event time slot`, async ({ page, users, bookings }) => {
    const { booking, user } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
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

    await test.step("Attendee #1 should be able to cancel their booking", async () => {
      await page.goto(`/booking/${booking.uid}?seatReferenceUid=${bookingSeats[0].referenceUid}`);

      await page.locator('[data-testid="cancel"]').click();
      await page.fill('[data-testid="cancel_reason"]', "Double booked!");
      await page.locator('[data-testid="confirm_cancel"]').click();
      await page.waitForLoadState("networkidle");

      await expect(page).toHaveURL(/\/booking\/.*/);

      const cancelledHeadline = page.locator('[data-testid="cancelled-headline"]');
      await expect(cancelledHeadline).toBeVisible();

      // Old booking should still exist, with one less attendee
      const updatedBooking = await prisma.booking.findFirst({
        where: { id: bookingSeats[0].bookingId },
        include: { attendees: true },
      });

      const attendeeIds = updatedBooking?.attendees.map(({ id }) => id);
      expect(attendeeIds).toHaveLength(2);
      expect(attendeeIds).not.toContain(bookingAttendees[0].id);
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

    await test.step("All attendees cancelling should delete the booking for the user", async () => {
      // The remaining 2 attendees cancel
      for (let i = 1; i < bookingSeats.length; i++) {
        await page.goto(`/booking/${booking.uid}?seatReferenceUid=${bookingSeats[i].referenceUid}`);

        await page.locator('[data-testid="cancel"]').click();
        await page.fill('[data-testid="cancel_reason"]', "Double booked!");
        await page.locator('[data-testid="confirm_cancel"]').click();

        await expect(page).toHaveURL(/\/booking\/.*/);

        const cancelledHeadline = page.locator('[data-testid="cancelled-headline"]');
        await expect(cancelledHeadline).toBeVisible();
      }

      // Should expect old booking to be cancelled
      const updatedBooking = await prisma.booking.findFirst({
        where: { id: bookingSeats[0].bookingId },
      });
      expect(updatedBooking).not.toBeNull();
      expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
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
  test("Should reschedule booking with seats", async ({ page, users, bookings }) => {
    const { booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: `first+seats-${uuid()}@cal.com`, timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: `second+seats-${uuid()}@cal.com`, timeZone: "Europe/Berlin" },
      { name: "John Third", email: `third+seats-${uuid()}@cal.com`, timeZone: "Europe/Berlin" },
    ]);
    const bookingAttendees = await prisma.attendee.findMany({
      where: { bookingId: booking.id },
      select: {
        id: true,
        email: true,
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

    // should wait for URL but that path starts with booking/
    await page.waitForURL(/\/booking\/.*/);

    await expect(page).toHaveURL(/\/booking\/.*/);

    // Should expect new booking to be created for John Third
    const newBooking = await prisma.booking.findFirst({
      where: {
        attendees: {
          some: { email: bookingAttendees[2].email },
        },
      },
      include: { seatsReferences: true, attendees: true },
    });
    expect(newBooking?.status).toBe(BookingStatus.PENDING);
    expect(newBooking?.attendees.length).toBe(1);
    expect(newBooking?.attendees[0].name).toBe("John Third");
    expect(newBooking?.seatsReferences.length).toBe(1);

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

    await page.waitForURL(/\/booking\/.*/);

    await page.goto(`/reschedule/${references[1].referenceUid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    // Using waitForUrl here fails the assertion `expect(oldBooking?.status).toBe(BookingStatus.CANCELLED);` probably because waitForUrl is considered complete before waitForNavigation and till that time the booking is not cancelled
    await page.waitForURL(/\/booking\/.*/);

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

  test("Should cancel with seats and have no attendees and cancelled", async ({ page, users, bookings }) => {
    const { user, booking } = await createUserWithSeatedEventAndAttendees({ users, bookings }, [
      { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
      { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
    ]);
    await user.apiLogin();

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

    await page.locator('[data-testid="confirm_cancel"]').click();

    await expect(page).toHaveURL(/\/booking\/.*/);

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

    await page.locator('[data-testid="confirm_cancel"]').click();

    await page.waitForLoadState("networkidle");

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
    await user.apiLogin();

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

    const foundFirstAttendeeAsOwner = await page.locator(
      'p[data-testid="attendee-email-first+seats@cal.com"]'
    );
    await expect(foundFirstAttendeeAsOwner).toHaveCount(1);
    const foundSecondAttendeeAsOwner = await page.locator(
      'p[data-testid="attendee-email-second+seats@cal.com"]'
    );
    await expect(foundSecondAttendeeAsOwner).toHaveCount(1);

    await page.goto("auth/logout");

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
    expect(name).toBe(user.username);

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
