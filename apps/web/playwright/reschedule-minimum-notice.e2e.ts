import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Reschedule with Minimum Cancellation Notice", async () => {
  test("Should block reschedule request when within minimum cancellation notice period", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    
    // Update event type to have 12-hour minimum cancellation notice (720 minutes)
    await prisma.eventType.update({
      where: {
        id: user.eventTypes[0].id,
      },
      data: {
        minimumCancellationNotice: 720, // 12 hours in minutes
      },
    });

    // Create a booking that starts 6 hours from now
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
      startTime: dayjs().add(6, "hours").toDate(),
      endTime: dayjs().add(6, "hours").add(30, "minutes").toDate(),
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming");

    // Click the ellipsis menu button to open the dropdown
    await page.locator('[data-testid="booking-actions-dropdown"]').nth(0).click();

    // Click reschedule request
    await page.locator('[data-testid="reschedule_request"]').click();

    // Fill in reschedule reason
    await page.fill('[data-testid="reschedule_reason"]', "Need to reschedule");

    // Click send request button
    await page.locator('button[data-testid="send_request"]').click();

    // Check for error message
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(
      "Cannot reschedule within 12 hours of event start"
    );

    // Verify the booking was not cancelled
    const updatedBooking = await booking.self();
    expect(updatedBooking?.rescheduled).toBe(false);
    expect(updatedBooking?.status).toBe(BookingStatus.ACCEPTED);
    
    await booking.delete();
  });

  test("Should allow reschedule request when outside minimum cancellation notice period", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    
    // Update event type to have 2-hour minimum cancellation notice (120 minutes)
    await prisma.eventType.update({
      where: {
        id: user.eventTypes[0].id,
      },
      data: {
        minimumCancellationNotice: 120, // 2 hours in minutes
      },
    });

    // Create a booking that starts 4 hours from now (outside the 2-hour notice period)
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
      startTime: dayjs().add(4, "hours").toDate(),
      endTime: dayjs().add(4, "hours").add(30, "minutes").toDate(),
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming");

    // Click the ellipsis menu button to open the dropdown
    await page.locator('[data-testid="booking-actions-dropdown"]').nth(0).click();

    // Click reschedule request
    await page.locator('[data-testid="reschedule_request"]').click();

    // Fill in reschedule reason
    await page.fill('[data-testid="reschedule_reason"]', "Need to reschedule");

    // Click send request button
    await page.locator('button[data-testid="send_request"]').click();

    // Check for success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "reschedule_request_sent"
    );

    // Verify the booking was cancelled with reschedule flag
    const updatedBooking = await booking.self();
    expect(updatedBooking?.rescheduled).toBe(true);
    expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
    expect(updatedBooking?.cancellationReason).toBe("Need to reschedule");
    
    await booking.delete();
  });

  test("Should show correct error message for different time periods", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    
    // Test with 90 minutes (1 hour and 30 minutes) minimum notice
    await prisma.eventType.update({
      where: {
        id: user.eventTypes[0].id,
      },
      data: {
        minimumCancellationNotice: 90, // 1 hour and 30 minutes
      },
    });

    // Create a booking that starts 1 hour from now
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
      startTime: dayjs().add(1, "hour").toDate(),
      endTime: dayjs().add(1, "hour").add(30, "minutes").toDate(),
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming");

    // Click the ellipsis menu button to open the dropdown
    await page.locator('[data-testid="booking-actions-dropdown"]').nth(0).click();

    // Click reschedule request
    await page.locator('[data-testid="reschedule_request"]').click();

    // Fill in reschedule reason
    await page.fill('[data-testid="reschedule_reason"]', "Need to reschedule");

    // Click send request button
    await page.locator('button[data-testid="send_request"]').click();

    // Check for error message with correct time format
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(
      "Cannot reschedule within 1 hour and 30 minutes of event start"
    );

    await booking.delete();
  });

  test("Should allow reschedule when no minimum notice is set", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    
    // Ensure no minimum cancellation notice is set (default is 0)
    await prisma.eventType.update({
      where: {
        id: user.eventTypes[0].id,
      },
      data: {
        minimumCancellationNotice: 0,
      },
    });

    // Create a booking that starts 30 minutes from now
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
      startTime: dayjs().add(30, "minutes").toDate(),
      endTime: dayjs().add(1, "hour").toDate(),
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming");

    // Click the ellipsis menu button to open the dropdown
    await page.locator('[data-testid="booking-actions-dropdown"]').nth(0).click();

    // Click reschedule request
    await page.locator('[data-testid="reschedule_request"]').click();

    // Fill in reschedule reason
    await page.fill('[data-testid="reschedule_reason"]', "Last minute change");

    // Click send request button
    await page.locator('button[data-testid="send_request"]').click();

    // Should succeed even though it's very close to the event time
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "reschedule_request_sent"
    );

    // Verify the booking was cancelled with reschedule flag
    const updatedBooking = await booking.self();
    expect(updatedBooking?.rescheduled).toBe(true);
    expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
    
    await booking.delete();
  });
});