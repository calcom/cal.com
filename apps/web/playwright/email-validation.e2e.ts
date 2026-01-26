import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.describe("Email field validation", () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  // This test verifies that email format is validated even when the email field is optional
  test("should validate email format even when email field is optional", async ({ page, users }) => {
    const user = await users.create({
      eventTypes: [
        {
          title: "Phone Only Event",
          slug: "phone-only",
          length: 30,
          bookingFields: [
            {
              name: "name",
              type: "name",
              label: "your_name",
              sources: [{ id: "default", type: "default", label: "Default" }],
              editable: "system",
              required: true,
              defaultLabel: "your_name",
            },
            {
              name: "email",
              type: "email",
              label: "email_address",
              sources: [{ id: "default", type: "default", label: "Default" }],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "email_address",
            },
            {
              name: "attendeePhoneNumber",
              type: "phone",
              label: "phone_number",
              sources: [{ id: "default", type: "default", label: "Default" }],
              editable: "system-but-optional",
              required: true,
              defaultLabel: "phone_number",
            },
            {
              name: "notes",
              type: "textarea",
              label: "additional_notes",
              sources: [{ id: "default", type: "default", label: "Default" }],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "additional_notes",
            },
            {
              name: "guests",
              type: "multiemail",
              label: "additional_guests",
              sources: [{ id: "default", type: "default", label: "Default" }],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "additional_guests",
            },
            {
              name: "rescheduleReason",
              type: "textarea",
              label: "reason_for_reschedule",
              sources: [{ id: "default", type: "default", label: "Default" }],
              editable: "system-but-optional",
              required: false,
              defaultLabel: "reason_for_reschedule",
              views: [{ id: "reschedule", label: "Reschedule View" }],
            },
          ],
        },
      ],
      overrideDefaultEventTypes: true,
    });

    await page.goto(`/${user.username}/phone-only`);
    await selectFirstAvailableTimeSlotNextMonth(page);

    await page.fill('[name="name"]', "Test User");
    await page.fill('[name="email"]', "+393496191286");
    await page.fill('[name="attendeePhoneNumber"]', "+393496191286");

    await page.locator('[data-testid="confirm-book-button"]').click();

    const emailError = page.locator('[data-fob-field-name="email"] [role="alert"]');
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

    const emailError = page.locator('[data-fob-field-name="email"] [role="alert"]');
    await expect(emailError).toBeVisible({ timeout: 5000 });
  });
});
