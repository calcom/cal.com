import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";

import { test } from "./lib/fixtures";
import { gotoBookingPage, saveEventType, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

const normalizePhone = (s: string) => s.replace(/[^+\d]/g, "");

test.describe.configure({ mode: "serial" });

test.describe("Phone Location Auto-fill Feature", () => {
  test("should auto-fill untouched phone fields when phone location is selected", async ({
    page,
    users,
  }, testInfo) => {
    testInfo.setTimeout(testInfo.timeout * 2); // Double the timeout for this test
    await createUserWithPhoneFields({ users, page });

    await gotoBookingPage(page);
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Verify custom phone fields start empty or country prefix (e.g., "+1")
    const v1 = await page.locator('[name="phone-1"]').inputValue();
    const v2 = await page.locator('[name="phone-2"]').inputValue();
    expect(v1 === "" || /^\+\d{1,3}$/.test(v1)).toBeTruthy();
    expect(v2 === "" || /^\+\d{1,3}$/.test(v2)).toBeTruthy();

    // Select phone location and enter phone number
    const phoneNumber = "+14155551234";
    await selectPhoneLocation(page);
    await fillPhoneLocationInput(page, phoneNumber);

    // Verify both custom phone fields are auto-filled (normalized)
    await expect
      .poll(async () => normalizePhone(await page.locator('[name="phone-1"]').inputValue()))
      .toBe(normalizePhone(phoneNumber));
    await expect
      .poll(async () => normalizePhone(await page.locator('[name="phone-2"]').inputValue()))
      .toBe(normalizePhone(phoneNumber));

    // Skip booking confirmation to keep this test fast and focused on autofill behavior
  });
});

// Helper Functions

async function createUserWithPhoneFields({
  users,
  page,
}: {
  users: ReturnType<typeof createUsersFixture>;
  page: Page;
}) {
  try {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/event-types");

    // Go to first event type
    const $eventTypes = page.locator("[data-testid=event-types] > li a");
    await $eventTypes.first().click();

    // Enable Attendee Phone Number location
    await selectAttendeePhoneNumber(page);

    // Add two custom phone fields
    await page.getByTestId("vertical-tab-event_advanced_tab_title").click();

    await addPhoneQuestion(page, "phone-1", "Phone Number 1", true);
    await addPhoneQuestion(page, "phone-2", "Phone Number 2", true);

    // Save once at the end
    await saveEventType(page);

    return user;
  } catch (error) {
    console.error("Failed to create user with phone fields:", error);
    throw error;
  }
}

async function addPhoneQuestion(page: Page, name: string, label: string, required: boolean) {
  await page.click('[data-testid="add-field"]');
  // Wait for modal to open by ensuring field-type control is present
  await page.locator("[id=test-field-type]").waitFor();

  // Select Phone type
  await page.locator("[id=test-field-type]").click();
  await page.locator('[data-testid="select-option-phone"]').waitFor();
  await page.locator('[data-testid="select-option-phone"]').click();

  // Fill name
  await page.fill('[name="name"]', name);

  // Fill label
  await page.fill('[name="label"]', label);

  // Set required if needed
  if (required) {
    // Try to find and check the required checkbox, but don't fail if it doesn't exist
    try {
      const requiredCheckbox = page.locator('input[name="required"]').first();
      await requiredCheckbox.waitFor({ timeout: 500 });
      await requiredCheckbox.check();
    } catch {
      // Checkbox not found or not needed
    }
  }

  // Click save button for the field
  await page.click('[data-testid="field-add-save"]');
  // Wait for the modal to close
  await page.locator('[data-testid="field-add-save"]').waitFor({ state: "detached" });
}

async function selectAttendeePhoneNumber(page: Page) {
  const locationOptionText = "Attendee Phone Number";
  await page.getByTestId("location-select").click();
  await page.locator(`text=${locationOptionText}`).click();
}

async function selectPhoneLocation(page: Page) {
  // When "Attendee Phone Number" is the location, the booking form
  // shows a phone input directly - no radio button selection needed.
  // Just wait for location field to be ready
  const locationField = page.locator('[data-fob-field-name="location"]');
  await locationField.waitFor({ timeout: 500 });
}

async function fillPhoneLocationInput(page: Page, phoneNumber: string) {
  // The location field has a phone input when "Attendee Phone Number" is selected
  const locationInput = page.locator(`[data-fob-field-name="location"] input`);
  await locationInput.waitFor({ timeout: 1000 });

  // Ensure the field is empty first
  await locationInput.clear();
  // Wait for mask/prefix to settle (empty string or just country prefix)
  await expect.poll(async () => locationInput.inputValue()).toMatch(/^(?:|\+\d{1,3})$/);

  // If the mask auto-inserts a country prefix, avoid duplicating it
  const prefill = await locationInput.inputValue();
  let toType = phoneNumber;
  if (/^\+\d{1,3}$/.test(prefill) && phoneNumber.startsWith(prefill)) {
    toType = phoneNumber.slice(prefill.length);
  }

  // Type the phone number with a small delay to play nicely with masking
  await locationInput.pressSequentially(toType, { delay: 20 });

  // Trigger blur to ensure the auto-fill effect runs
  await page.locator('[name="name"]').click();
}

// removed local gotoBookingPage/selectFirstAvailableTimeSlot/saveEventType in favor of shared helpers
