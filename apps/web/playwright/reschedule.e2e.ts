import { expect } from "@playwright/test";
import { BookingStatus } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

const IS_STRIPE_ENABLED = !!(
  process.env.STRIPE_CLIENT_ID &&
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
  process.env.STRIPE_PRIVATE_KEY
);

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Reschedule Tests", async () => {
  test("Should do a booking request reschedule from /bookings", async ({ page, users, bookings }) => {
    const user = await users.create();

    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
    });

    await user.login();
    await page.goto("/bookings/upcoming");

    await page.locator('[data-testid="edit_booking"]').nth(0).click();

    await page.locator('[data-testid="reschedule_request"]').click();

    await page.fill('[data-testid="reschedule_reason"]', "I can't longer have it");

    await page.locator('button[data-testid="send_request"]').click();
    await expect(page.locator('[id="modal-title"]')).toBeHidden();

    const updatedBooking = await booking.self();

    expect(updatedBooking.rescheduled).toBe(true);
    expect(updatedBooking.cancellationReason).toBe("I can't longer have it");
    expect(updatedBooking.status).toBe(BookingStatus.CANCELLED);
    await booking.delete();
  });

  test("Should display former time when rescheduling availability", async ({ page, users, bookings }) => {
    test.skip(true, "TODO: Re-enable after v1.7 launch");
    const user = await users.create();
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.CANCELLED,
      rescheduled: true,
    });

    await page.goto(`/${user.username}/${user.eventTypes[0].slug}?rescheduleUid=${booking.uid}`);
    const formerTimeElement = page.locator('[data-testid="former_time_p_desktop"]');
    await expect(formerTimeElement).toBeVisible();
    await booking.delete();
  });

  test("Should display request reschedule send on bookings/cancelled", async ({ page, users, bookings }) => {
    const user = await users.create();
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id, {
      status: BookingStatus.CANCELLED,
      rescheduled: true,
    });

    await user.login();
    await page.goto("/bookings/cancelled");

    const requestRescheduleSentElement = page.locator('[data-testid="request_reschedule_sent"]').nth(1);
    await expect(requestRescheduleSentElement).toBeVisible();
    await booking.delete();
  });

  test("Should do a reschedule from user owner", async ({ page, users, bookings }) => {
    const user = await users.create();
    const [eventType] = user.eventTypes;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.CANCELLED,
      rescheduled: true,
    });

    await page.goto(`/${user.username}/${eventType.slug}?rescheduleUid=${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await expect(page.locator('[name="name"]')).toBeDisabled();
    await expect(page.locator('[name="email"]')).toBeDisabled();

    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // NOTE: remove if old booking should not be deleted
    expect(await booking.self()).toBeNull();

    const newBooking = await prisma.booking.findFirst({ where: { fromReschedule: booking.uid } });
    expect(newBooking).not.toBeNull();
    await prisma.booking.delete({ where: { id: newBooking?.id } });
  });

  test("Unpaid rescheduling should go to payment page", async ({ page, users, bookings, payments }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_STRIPE_ENABLED, "Skipped as Stripe is not installed");
    const user = await users.create();
    await user.login();
    await user.getPaymentCredential();
    const eventType = user.eventTypes.find((e) => e.slug === "paid")!;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      rescheduled: true,
      status: BookingStatus.CANCELLED,
      paid: false,
    });
    await prisma.eventType.update({
      where: {
        id: eventType.id,
      },
      data: {
        metadata: {
          apps: {
            stripe: {
              price: 20000,
              enabled: true,
              currency: "usd",
            },
          },
        },
      },
    });
    const payment = await payments.create(booking.id);
    await page.goto(`/${user.username}/${eventType.slug}?rescheduleUid=${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    await page.waitForNavigation({
      url(url) {
        return url.pathname.indexOf("/payment") > -1;
      },
    });

    await expect(page).toHaveURL(/.*payment/);
    await payment.delete();
  });

  test("Paid rescheduling should go to success page", async ({ page, users, bookings, payments }) => {
    const user = await users.create();
    await user.login();
    await user.getPaymentCredential();
    await users.logout();
    const eventType = user.eventTypes.find((e) => e.slug === "paid")!;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      rescheduled: true,
      status: BookingStatus.CANCELLED,
      paid: true,
    });

    const payment = await payments.create(booking.id);
    await page.goto(`/${user?.username}/${eventType?.slug}?rescheduleUid=${booking?.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    await expect(page).toHaveURL(/.*booking/);

    await payment.delete();
  });

  test("Opt in event should be PENDING when rescheduled by USER", async ({ page, users, bookings }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "opt-in")!;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.ACCEPTED,
    });

    await page.goto(`/${user.username}/${eventType.slug}?rescheduleUid=${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    await expect(page).toHaveURL(/.*booking/);

    const newBooking = await prisma.booking.findFirst({ where: { fromReschedule: booking?.uid } });
    expect(newBooking).not.toBeNull();
    expect(newBooking?.status).toBe(BookingStatus.PENDING);
  });

  test("Opt in event should be ACCEPTED when rescheduled by OWNER", async ({ page, users, bookings }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "opt-in")!;
    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.ACCEPTED,
    });
    await user.login();

    await page.goto(`/${user.username}/${eventType.slug}?rescheduleUid=${booking.uid}`);

    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.locator('[data-testid="confirm-reschedule-button"]').click();

    await expect(page).toHaveURL(/.*booking/);

    const newBooking = await prisma.booking.findFirst({ where: { fromReschedule: booking?.uid } });
    expect(newBooking).not.toBeNull();
    expect(newBooking?.status).toBe(BookingStatus.ACCEPTED);
  });

  test.describe("Reschedule for booking with seats", () => {
    test("Should reschedule booking with seats", async ({ page, users, bookings }) => {
      const user = await users.create();
      const eventType = user.eventTypes.find((e) => e.slug === "seats")!;
      const booking = await bookings.create(user.id, user.username, eventType.id, {
        status: BookingStatus.ACCEPTED,
        // startTime with 1 day from now and endTime half hour after
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        attendees: {
          createMany: {
            data: [
              { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
              { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
              { name: "John Third", email: "third+seats@cal.com", timeZone: "Europe/Berlin" },
            ],
          },
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

    test("Should reschedule booking with seats and if everyone rescheduled it should be cancelled", async ({
      page,
      users,
      bookings,
    }) => {
      const user = await users.create();
      const eventType = user.eventTypes.find((e) => e.slug === "seats")!;
      const booking = await bookings.create(user.id, user.username, eventType.id, {
        status: BookingStatus.ACCEPTED,
        // startTime with 1 day from now and endTime half hour after
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        attendees: {
          createMany: {
            data: [
              { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
              { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
            ],
          },
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

      const references = await prisma.bookingSeat.findMany({
        where: { bookingId: booking.id },
      });

      await page.goto(`/reschedule/${references[0].referenceUid}`);

      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.locator('[data-testid="confirm-reschedule-button"]').click();

      await expect(page).toHaveURL(/.*booking/);

      await page.goto(`/reschedule/${references[1].referenceUid}`);

      await selectFirstAvailableTimeSlotNextMonth(page);

      await page.locator('[data-testid="confirm-reschedule-button"]').click();

      await page.waitForNavigation({
        url(url) {
          return url.pathname.indexOf("/booking") > -1;
        },
      });

      await expect(page).toHaveURL(/.*booking/);

      await page.waitForLoadState("networkidle");

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

      expect(oldBooking?.attendees).toBeFalsy();
    });

    test("Should cancel with seats and have no attendees and cancelled", async ({
      page,
      users,
      bookings,
    }) => {
      const user = await users.create();
      const eventType = user.eventTypes.find((e) => e.slug === "seats")!;
      const booking = await bookings.create(user.id, user.username, eventType.id, {
        status: BookingStatus.ACCEPTED,
        // startTime with 1 day from now and endTime half hour after
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        attendees: {
          createMany: {
            data: [
              { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
              { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
            ],
          },
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

      // Now we cancel the booking as the organizer
      await page.goto(`/booking/${booking.uid}?cancel=true`);

      await page.locator('[data-testid="cancel"]').click();

      await expect(page).toHaveURL(/.*booking/);

      // Should expect old booking to be cancelled

      const oldBooking = await prisma.booking.findFirst({
        where: { uid: booking.uid },
        include: { seatsReferences: true, attendees: true },
      });

      expect(oldBooking?.status).toBe(BookingStatus.CANCELLED);
      expect(oldBooking?.attendees.length).toBe(0);
    });
  });

  test("If rescheduled/cancelled booking with seats it should display the correct number of seats", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    const eventType = user.eventTypes.find((e) => e.slug === "seats")!;

    const booking = await bookings.create(user.id, user.username, eventType.id, {
      status: BookingStatus.ACCEPTED,
      // startTime with 1 day from now and endTime half hour after
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      attendees: {
        createMany: {
          data: [
            { name: "John First", email: "first+seats@cal.com", timeZone: "Europe/Berlin" },
            { name: "Jane Second", email: "second+seats@cal.com", timeZone: "Europe/Berlin" },
          ],
        },
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

    const references = await prisma.bookingSeat.findMany({
      where: { bookingId: booking.id },
    });

    await page.goto(
      `/booking/${references[0].referenceUid}?cancel=true&seatReferenceUid=${references[0].referenceUid}`
    );

    await page.locator('[data-testid="cancel"]').click();

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

    await page.waitForTimeout(1000);
    await page.click('[data-testid="incrementMonth"]');
    await page.waitForTimeout(1000);
    await page.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();

    // Validate that the number of seats its 10
    expect(await page.locator("text=9 / 10 Seats available").count()).toEqual(0);
  });
});
