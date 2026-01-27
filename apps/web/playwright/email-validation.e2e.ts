import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth, submitAndWaitForResponse } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Email field validation", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  // This test verifies that email format is validated even when the email field is optional
  test("should validate email format even when email field is optional", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    // Get the first event type ID
    const eventTypes = await user.getEventTypes();
    const eventTypeId = eventTypes[0].id;

    // Configure the event type to have phone required and email optional
    await markPhoneNumberAsRequiredAndEmailAsOptional(page, eventTypeId);

    // Go to the booking page
    await page.goto(`/${user.username}/${eventTypes[0].slug}`);
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Fill in the form with a phone number in the email field
    await page.fill('[name="name"]', "Test User");
    await page.fill('[name="email"]', "+393496191286");
    await page.fill('[name="attendeePhoneNumber"]', "+393496191286");

    // Click the confirm button
    await page.locator('[data-testid="confirm-book-button"]').click();

    // Expect validation error for invalid email format
    const emailError = page.locator('[data-testid="error-message-email"]');
    await expect(emailError).toBeVisible({ timeout: 5000 });
  });

  test("should show validation error when phone number is entered in required email field", async ({
    page,
    users,
  }) => {
    const user = await users.create();

    await page.goto(`/${user.username}/30-min`);
    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.fill('[name="name"]', "Test User");
    await page.fill('[name="email"]', "+393496191286");

    await page.locator('[data-testid="confirm-book-button"]').click();

    const emailError = page.locator('[data-testid="error-message-email"]');
    await expect(emailError).toBeVisible({ timeout: 5000 });
  });
});

// Helper functions to configure event type fields through the UI

const markPhoneNumberAsRequiredAndEmailAsOptional = async (page: Page, eventId: number) => {
  // Make phone as required
  await markPhoneNumberAsRequiredField(page, eventId);

  // Make email as not required
  await page.locator('[data-testid="field-email"] [data-testid="edit-field-action"]').click();
  const emailRequiredField = page.locator('[data-testid="field-required"]').first();
  await emailRequiredField.click();
  await page.getByTestId("field-add-save").click();
  await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
    action: () => page.locator("[data-testid=update-eventtype]").click(),
  });
};

const markPhoneNumberAsRequiredField = async (page: Page, eventId: number) => {
  await page.goto(`/event-types/${eventId}?tabName=advanced`);
  await expect(page.getByTestId("vertical-tab-basics")).toContainText("Basics"); // fix the race condition

  await page.locator('[data-testid="field-attendeePhoneNumber"] [data-testid="toggle-field"]').click();
  await page.locator('[data-testid="field-attendeePhoneNumber"] [data-testid="edit-field-action"]').click();
  const phoneRequiredField = page.locator('[data-testid="field-required"]').first();
  await phoneRequiredField.click();
  await page.getByTestId("field-add-save").click();
  await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
    action: () => page.locator("[data-testid=update-eventtype]").click(),
  });
};
