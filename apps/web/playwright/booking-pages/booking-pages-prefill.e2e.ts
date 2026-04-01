import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth, submitAndWaitForResponse, testEmail, testName } from "../lib/testUtils";

test.describe("Booking page prefill - case-insensitive field matching", () => {
  test("should prefill attendeePhoneNumber from lowercase query param (routing form scenario)", async ({
    page,
    users,
  }) => {
    const user = await users.create();
    await user.apiLogin();
    const eventType = await user.getFirstEventAsOwner();

    // Enable attendeePhoneNumber system field on the event type
    await page.goto(`/event-types/${eventType.id}?tabName=advanced`);
    await expect(page.getByTestId("vertical-tab-basics")).toContainText("Basics");
    await page.locator('[data-testid="field-attendeePhoneNumber"] [data-testid="toggle-field"]').click();
    await submitAndWaitForResponse(page, "/api/trpc/eventTypesHeavy/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });

    // Navigate to booking page with lowercase "attendeephonenumber" query param
    // This simulates what routing forms do: field identifiers are lowercased in query params
    const phoneNumber = "+919999999999";
    await page.goto(
      `/${user.username}/${eventType.slug}?attendeephonenumber=${encodeURIComponent(phoneNumber)}`
    );
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Verify the phone field is prefilled via case-insensitive matching
    const phoneInput = page.locator('[name="attendeePhoneNumber"]');
    await expect(phoneInput).toBeVisible();
    const phoneValue = await phoneInput.inputValue();
    expect(phoneValue.replace(/[^+\d]/g, "")).toContain("919999999999");

    // Fill remaining required fields
    await page.fill('[name="name"]', testName);
    await page.fill('[name="email"]', testEmail);

    // Intercept the booking request to verify attendeePhoneNumber is sent with camelCase key
    const bookingRequestPromise = page.waitForRequest((req) => req.url().includes("/api/book/event"));
    await page.locator('[data-testid="confirm-book-button"]').click();
    const bookingRequest = await bookingRequestPromise;
    const requestBody = bookingRequest.postDataJSON();

    // The responses object should contain "attendeePhoneNumber" (camelCase), not the lowercase variant
    expect(requestBody.responses.attendeePhoneNumber).toBeDefined();
    expect(requestBody.responses.attendeePhoneNumber.replace(/[^+\d]/g, "")).toContain("919999999999");
    // The stale lowercase key should not be present in the booking request
    expect(requestBody.responses.attendeephonenumber).toBeUndefined();

    await expect(page.locator("[data-testid=success-page]")).toBeVisible();
  });
});
