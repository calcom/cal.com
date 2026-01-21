import { test } from "@calcom/web/playwright/lib/fixtures";
import { expect } from "@playwright/test";
import { deleteAllBookingsByEmail, ensureEmbedIframe, getBooking } from "../lib/testUtils";

// Mobile viewport dimensions
const MOBILE_VIEWPORT = { width: 375, height: 667 };

test.describe("Two Step Slot Selection", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async () => {
    await deleteAllBookingsByEmail("john@booker.com");
  });

  test("should open slot selection modal on mobile when date is clicked", async ({ page, embeds }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);

    const calNamespace = "twoStepSlotSelection";
    await embeds.gotoPlayground({ calNamespace, url: "/?only=ns:twoStepSlotSelection" });

    const embedIframe = await ensureEmbedIframe({ calNamespace, page, pathname: "/free/30min" });

    // Wait for the booker to be ready
    await embedIframe.waitForSelector('[data-testid="day"]');

    // Click on an available date
    await embedIframe.locator('[data-testid="day"][data-disabled="false"]').first().click();

    // Verify the slot selection modal opens (it has the two-step-slot-selection-modal-header class)
    await expect(embedIframe.locator(".two-step-slot-selection-modal-header")).toBeVisible();

    // Verify time slots are visible in the modal
    await expect(embedIframe.locator('[data-testid="time"]').first()).toBeVisible();
  });

  test("should complete booking with prefilled form data (skipConfirmStep) in two-step modal", async ({
    page,
    embeds,
  }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);

    const calNamespace = "twoStepSlotSelection";
    await embeds.gotoPlayground({ calNamespace, url: "/?only=ns:twoStepSlotSelection" });

    const embedIframe = await ensureEmbedIframe({ calNamespace, page, pathname: "/free/30min" });

    // Wait for the booker to be ready
    await embedIframe.waitForSelector('[data-testid="day"]');

    // Go to next month to ensure availability
    await embedIframe.click('[data-testid="incrementMonth"]');
    await embedIframe.waitForTimeout(1000);

    // Click on an available date
    await embedIframe.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();

    // Wait for modal to open
    await expect(embedIframe.locator(".two-step-slot-selection-modal-header")).toBeVisible();

    // Wait for time slots to be visible in the modal
    await embedIframe.waitForSelector('[data-testid="time"]');

    // Wait for the async skipConfirmStep validation to complete
    // The useSkipConfirmStep hook runs an async schema validation when bookerState becomes "selecting_time"
    // We need to give it time to validate the prefilled form data
    await embedIframe.waitForTimeout(1000);

    // Click on a time slot - this should show the confirm button since form is prefilled
    await embedIframe.locator('[data-testid="time"]').first().click();

    // Wait for confirm button to appear (skip-confirm-book-button appears when skipConfirmStep is true)
    await expect(embedIframe.locator('[data-testid="skip-confirm-book-button"]')).toBeVisible();

    // Set up response listener before clicking
    const responsePromise = page.waitForResponse("**/api/book/event");

    // Click the confirm button
    await embedIframe.locator('[data-testid="skip-confirm-book-button"]').click();

    // Verify the button shows loading state (modal should stay open while loading)
    // The modal should remain visible during booking
    await expect(embedIframe.locator(".two-step-slot-selection-modal-header")).toBeVisible();

    // Wait for booking response
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const booking = (await response.json()) as { uid: string };

    // Verify the booking was created with booker and prefilled guest
    const bookingFromDb = await getBooking(booking.uid);
    expect(bookingFromDb.attendees.length).toBe(2);
    const attendeeEmails = bookingFromDb.attendees.map((a) => a.email);
    expect(attendeeEmails).toContain("john@booker.com");
    expect(attendeeEmails).toContain("guest@example.com");
  });

  test("should show confirm button next to slot when form is prefilled", async ({ page, embeds }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);

    const calNamespace = "twoStepSlotSelection";
    await embeds.gotoPlayground({ calNamespace, url: "/?only=ns:twoStepSlotSelection" });

    const embedIframe = await ensureEmbedIframe({ calNamespace, page, pathname: "/free/30min" });

    // Wait for the booker to be ready
    await embedIframe.waitForSelector('[data-testid="day"]');

    // Go to next month
    await embedIframe.click('[data-testid="incrementMonth"]');
    await embedIframe.waitForTimeout(1000);

    // Click on an available date
    await embedIframe.locator('[data-testid="day"][data-disabled="false"]').nth(1).click();

    // Wait for modal to open
    await expect(embedIframe.locator(".two-step-slot-selection-modal-header")).toBeVisible();

    // Click on a time slot
    await embedIframe.locator('[data-testid="time"]').first().click();

    // Verify confirm button appears next to the slot
    const confirmButton = embedIframe.locator('[data-testid="skip-confirm-book-button"]');
    await expect(confirmButton).toBeVisible();

    // Verify button text is "Confirm" or "Pay and Book"
    const buttonText = await confirmButton.textContent();
    expect(buttonText?.toLowerCase()).toMatch(/confirm|pay/);
  });

  test("should close modal when back button is clicked", async ({ page, embeds }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);

    const calNamespace = "twoStepSlotSelection";
    await embeds.gotoPlayground({ calNamespace, url: "/?only=ns:twoStepSlotSelection" });

    const embedIframe = await ensureEmbedIframe({ calNamespace, page, pathname: "/free/30min" });

    // Wait for the booker to be ready
    await embedIframe.waitForSelector('[data-testid="day"]');

    // Click on an available date
    await embedIframe.locator('[data-testid="day"][data-disabled="false"]').first().click();

    // Verify modal opens
    await expect(embedIframe.locator(".two-step-slot-selection-modal-header")).toBeVisible();

    // Click the back button in the modal header
    await embedIframe.locator(".two-step-slot-selection-modal-header button").first().click();

    // Verify modal closes
    await expect(embedIframe.locator(".two-step-slot-selection-modal-header")).not.toBeVisible();
  });

  test("should NOT open modal on desktop even with useSlotsViewOnSmallScreen enabled", async ({
    page,
    embeds,
  }) => {
    // Use desktop viewport (default is usually larger than 768px)
    await page.setViewportSize({ width: 1280, height: 720 });

    const calNamespace = "twoStepSlotSelection";
    await embeds.gotoPlayground({ calNamespace, url: "/?only=ns:twoStepSlotSelection" });

    const embedIframe = await ensureEmbedIframe({ calNamespace, page, pathname: "/free/30min" });

    // Wait for the booker to be ready
    await embedIframe.waitForSelector('[data-testid="day"]');

    // Click on an available date
    await embedIframe.locator('[data-testid="day"][data-disabled="false"]').first().click();

    // Wait a bit to ensure modal would have opened if it was going to
    await embedIframe.waitForTimeout(500);

    // Verify the modal does NOT open on desktop
    await expect(embedIframe.locator(".two-step-slot-selection-modal-header")).not.toBeVisible();

    // Time slots should be visible in the regular view (not modal)
    await expect(embedIframe.locator('[data-testid="time"]').first()).toBeVisible();
  });
});
