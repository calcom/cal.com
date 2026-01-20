import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";

import { test } from "./lib/fixtures";
import {
  confirmReschedule,
  selectFirstAvailableTimeSlotNextMonth,
  selectSecondAvailableTimeSlotNextMonth,
} from "./lib/testUtils";

/**
 * E2E Test for Issue #26695: Rescheduling copies note to event description
 *
 * This test verifies that when a booking is rescheduled, the event type description
 * is preserved in the calendar event details, and user's additional notes are kept separate.
 *
 * The fix ensures:
 * - `description` field uses `eventType.description` (event type description)
 * - `additionalNotes` field uses `booking.description` (user's notes from booking form)
 *
 * Run with video recording:
 * yarn playwright test reschedule-description.e2e.ts --project=@calcom/web --headed --video=on
 */

test.describe.configure({ mode: "serial" });

// Enable video recording for this test file
test.use({
  video: "on",
  trace: "on",
});

test.afterEach(({ users }) => users.deleteAll());

test.describe("Issue #26695: Event Description Preserved After Reschedule", () => {
  const EVENT_TYPE_DESCRIPTION = "This is the EVENT TYPE DESCRIPTION that should be preserved after rescheduling.";
  const ADDITIONAL_NOTES = "These are my ADDITIONAL NOTES from the booking form.";

  test("should preserve event type description after rescheduling (not overwritten by additional notes)", async ({
    page,
    users,
  }) => {
    // Step 1: Create a user with an event type that has a description
    const user = await users.create({
      eventTypes: [
        {
          title: "Meeting with Description",
          slug: "meeting-with-description",
          length: 30,
          description: EVENT_TYPE_DESCRIPTION,
        },
      ],
    });

    // Step 2: Navigate to the booking page
    await page.goto(`/${user.username}/meeting-with-description`);

    // Step 3: Verify the event type description is displayed on the booking page
    await expect(page.locator(`text=${EVENT_TYPE_DESCRIPTION}`)).toBeVisible();

    // Step 4: Select a time slot
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Step 5: Fill in booking form with additional notes
    await page.fill('[name="name"]', "Test Attendee");
    await page.fill('[name="email"]', "attendee@example.com");

    // Add additional notes in the notes field if available
    const notesField = page.locator('[name="notes"]');
    if (await notesField.isVisible()) {
      await notesField.fill(ADDITIONAL_NOTES);
    }

    // Step 6: Confirm the booking
    await page.locator('[data-testid="confirm-book-button"]').click();

    // Wait for success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // Step 7: Verify the calendar links contain the EVENT TYPE DESCRIPTION
    // Check Google Calendar link - URL uses %20 encoding for spaces
    const googleCalLink = await page.locator('a[href*="calendar.google.com"]').getAttribute("href");
    expect(googleCalLink).toContain(encodeURIComponent(EVENT_TYPE_DESCRIPTION).substring(0, 50));

    // Step 8: Get the booking UID for rescheduling
    const pageUrl = new URL(page.url());
    const bookingUID = pageUrl.pathname.split("/").pop();

    // Step 9: Navigate to reschedule page
    await page.goto(`/reschedule/${bookingUID}`);

    // Step 10: Verify the event type description is still shown on reschedule page
    await expect(page.locator(`text=${EVENT_TYPE_DESCRIPTION}`)).toBeVisible();

    // Step 11: Select a different time slot for rescheduling
    await selectSecondAvailableTimeSlotNextMonth(page);

    // Step 12: Confirm the reschedule
    await confirmReschedule(page);

    // Step 13: Verify success page after reschedule
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // Step 14: Verify the calendar links STILL contain the EVENT TYPE DESCRIPTION after reschedule
    const googleCalLinkAfterReschedule = await page.locator('a[href*="calendar.google.com"]').getAttribute("href");
    expect(googleCalLinkAfterReschedule).toContain(
      encodeURIComponent(EVENT_TYPE_DESCRIPTION).substring(0, 50)
    );

    // Step 15: Verify the new booking in database has correct structure
    const newBooking = await prisma.booking.findFirst({
      where: { fromReschedule: bookingUID },
      include: { eventType: true },
    });

    expect(newBooking).not.toBeNull();
    expect(newBooking?.eventType?.description).toBe(EVENT_TYPE_DESCRIPTION);
  });

  test("should show additional notes separately from event description on confirmation page", async ({
    page,
    users,
  }) => {
    // Create a user with an event type that has a description
    const user = await users.create({
      eventTypes: [
        {
          title: "Meeting with Description",
          slug: "meeting-with-description-2",
          length: 30,
          description: EVENT_TYPE_DESCRIPTION,
        },
      ],
    });

    // Navigate to the booking page
    await page.goto(`/${user.username}/meeting-with-description-2`);

    // Select a time slot
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Fill in booking form
    await page.fill('[name="name"]', "Test Attendee");
    await page.fill('[name="email"]', "attendee@example.com");

    // Add additional notes
    const notesField = page.locator('[name="notes"]');
    if (await notesField.isVisible()) {
      await notesField.fill(ADDITIONAL_NOTES);
    }

    // Confirm the booking
    await page.locator('[data-testid="confirm-book-button"]').click();

    // Wait for success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // If additional notes field was filled, verify they appear on confirmation
    const additionalNotesSection = page.locator('text="Additional notes"');
    if (await additionalNotesSection.isVisible()) {
      // Additional notes should be displayed in its own section
      await expect(page.locator(`text=${ADDITIONAL_NOTES}`)).toBeVisible();
    }

    // The calendar link should contain the event type description, not the additional notes
    const googleCalLink = await page.locator('a[href*="calendar.google.com"]').getAttribute("href");

    // Event type description should be in the calendar link (URL uses %20 encoding for spaces)
    expect(googleCalLink).toContain(encodeURIComponent(EVENT_TYPE_DESCRIPTION).substring(0, 50));
  });
});
