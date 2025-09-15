import { expect } from "@playwright/test";

import dayjs from "@calcom/dayjs";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("Cancellation Validation with Minimum Notice", () => {
  test("Should prevent cancellation when within minimum notice period", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    
    // Update event type to have 2-hour minimum cancellation notice
    await prisma.eventType.update({
      where: {
        id: user.eventTypes[0].id,
      },
      data: {
        minimumCancellationNotice: 120, // 2 hours in minutes
      },
    });

    // Create a booking that starts 1 hour from now (within the 2-hour notice period)
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
      startTime: dayjs().add(1, "hour").toDate(),
      endTime: dayjs().add(1, "hour").add(30, "minutes").toDate(),
      title: "Test Booking 30min",
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded", timeout: 180000 });

    // Try to cancel the booking
    await page.locator('[data-testid="booking-actions-dropdown"]').first().click();
    await page.locator('[data-testid="cancel"]').click();
    await page.locator('[data-testid="cancel_reason"]').fill("Need to cancel");
    
    // Attempt to confirm cancellation
    const cancelButton = page.locator('[data-testid="confirm_cancel"]');
    await cancelButton.click();

    // Check for error message
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(
      "Cannot cancel booking within 2 hours of start time"
    );

    // Verify the booking was not cancelled
    const updatedBooking = await booking.self();
    expect(updatedBooking?.status).toBe(BookingStatus.ACCEPTED);
    
    await booking.delete();
  });

  test("Should allow cancellation when outside minimum notice period", async ({
    page,
    users,
    bookings,
  }) => {
    const user = await users.create();
    
    // Update event type to have 1-hour minimum cancellation notice
    await prisma.eventType.update({
      where: {
        id: user.eventTypes[0].id,
      },
      data: {
        minimumCancellationNotice: 60, // 1 hour in minutes
      },
    });

    // Create a booking that starts 2 hours from now (outside the 1-hour notice period)
    const booking = await bookings.create(user.id, user.username, user.eventTypes[0].id!, {
      status: BookingStatus.ACCEPTED,
      startTime: dayjs().add(2, "hours").toDate(),
      endTime: dayjs().add(2, "hours").add(30, "minutes").toDate(),
      title: "Test Booking 30min",
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded", timeout: 180000 });

    // Cancel the booking
    await page.locator('[data-testid="booking-actions-dropdown"]').first().click();
    await page.locator('[data-testid="cancel"]').click();
    await page.locator('[data-testid="cancel_reason"]').fill("Need to cancel");
    await page.locator('[data-testid="confirm_cancel"]').click();

    // Check for success message
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Booking cancelled"
    );

    // Verify the booking was cancelled
    const updatedBooking = await booking.self();
    expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
    
    await booking.delete();
  });

  test("Should allow cancellation when no minimum notice is set", async ({
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
      title: "Test Booking 30min",
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded", timeout: 180000 });

    // Cancel the booking
    await page.locator('[data-testid="booking-actions-dropdown"]').first().click();
    await page.locator('[data-testid="cancel"]').click();
    await page.locator('[data-testid="cancel_reason"]').fill("Last minute cancellation");
    await page.locator('[data-testid="confirm_cancel"]').click();

    // Should succeed even though it's very close to the event time
    await expect(page.locator('[data-testid="toast-success"]')).toContainText(
      "Booking cancelled"
    );

    // Verify the booking was cancelled
    const updatedBooking = await booking.self();
    expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);
    
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
      title: "Test Booking 30min",
    });

    await user.apiLogin();
    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded", timeout: 180000 });

    // Try to cancel the booking
    await page.locator('[data-testid="booking-actions-dropdown"]').first().click();
    await page.locator('[data-testid="cancel"]').click();
    await page.locator('[data-testid="cancel_reason"]').fill("Need to cancel");
    await page.locator('[data-testid="confirm_cancel"]').click();

    // Check for error message with correct time format
    await expect(page.locator('[data-testid="toast-error"]')).toContainText(
      "Cannot cancel booking within 1 hour and 30 minutes of start time"
    );

    await booking.delete();
  });

  test("Should update minimum cancellation notice in event type settings", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();

    // Go to event types
    await page.goto("/event-types", { waitUntil: "domcontentloaded", timeout: 180000 });
    
    // Click on the first event type
    await page.locator('[data-testid="event-type-title"]').first().click();
    
    // Navigate to the Limits tab
    await page.locator('[data-testid="vertical-tab-limits"]').click();
    
    // Find and update the minimum cancellation notice input
    const input = page.locator('input[name="minimumCancellationNotice"]');
    await input.fill("180"); // 3 hours
    
    // Save the event type
    await page.locator('[data-testid="update-eventtype"]').click();
    
    // Check for success message
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    
    // Verify the value was saved
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: user.eventTypes[0].id,
      },
      select: {
        minimumCancellationNotice: true,
      },
    });
    
    expect(eventType?.minimumCancellationNotice).toBe(180);
  });
});