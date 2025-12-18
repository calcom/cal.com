import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { createUsersFixture } from "playwright/fixtures/users";

import { test } from "./lib/fixtures";
import { gotoBookingPage, saveEventType, selectFirstAvailableTimeSlotNextMonth } from "./lib/testUtils";

const normalizePhone = (s: string) => s.replace(/[^+\d]/g, "");

test.describe.configure({ mode: "serial" });

test.describe("Phone Location Auto-fill Feature", () => {
  test("should auto-fill untouched phone fields when phone location is selected", async ({ page, users }) => {
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

  test("should NOT sync changes from custom phone fields back to location or other fields", async ({ page, users }) => {
    await createUserWithPhoneFields({ users, page });

    await gotoBookingPage(page);
    await selectFirstAvailableTimeSlotNextMonth(page);

    // Select phone location and enter phone number
    const locationPhoneNumber = "+14155551234";
    await selectPhoneLocation(page);
    await fillPhoneLocationInput(page, locationPhoneNumber);

    // Verify both custom phone fields are auto-filled
    await expect
      .poll(async () => normalizePhone(await page.locator('[name="phone-1"]').inputValue()))
      .toBe(normalizePhone(locationPhoneNumber));
    await expect
      .poll(async () => normalizePhone(await page.locator('[name="phone-2"]').inputValue()))
      .toBe(normalizePhone(locationPhoneNumber));

    // Now manually change phone-2 to a different number
    const differentPhoneNumber = "+14155559999";
    const phone2Input = page.locator('[name="phone-2"]');
    await phone2Input.clear();
    await phone2Input.fill(differentPhoneNumber);
    await phone2Input.blur(); // Trigger blur event

    // Verify phone-1 is still the original location phone (NOT changed to phone-2's value)
    const phone1Value = await page.locator('[name="phone-1"]').inputValue();
    expect(normalizePhone(phone1Value)).toBe(normalizePhone(locationPhoneNumber));

    // Verify location field is still the original value (NOT changed to phone-2's value)
    const locationValue = await page.locator(`[data-fob-field-name="location"] input`).inputValue();
    expect(normalizePhone(locationValue)).toBe(normalizePhone(locationPhoneNumber));

    // Verify phone-2 has the new value
    const phone2Value = await page.locator('[name="phone-2"]').inputValue();
    expect(normalizePhone(phone2Value)).toBe(normalizePhone(differentPhoneNumber));
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
  await page.waitForSelector("[id=test-field-type]");

  // Select Phone type
  await page.locator("[id=test-field-type]").click();
  await page.waitForSelector('[data-testid="select-option-phone"]');
  await page.locator('[data-testid="select-option-phone"]').click();

  // Fill name
  await page.fill('[name="name"]', name);

  // Fill label
  await page.fill('[name="label"]', label);

  // Set required if needed
  if (required) {
    // Try to find and check the required checkbox, but don't fail if it doesn't exist
    try {
      await page.waitForSelector('input[name="required"]', { timeout: 500 });
      const requiredCheckbox = page.locator('input[name="required"]').first();
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
  await page.getByTestId("location-select").click();
  await page.getByTestId("location-select-item-phone").click();
}

async function selectPhoneLocation(page: Page) {
  // When "Attendee Phone Number" is the location, the booking form
  // shows a phone input directly - no radio button selection needed.
  // Just wait for location field to be ready
  await page.waitForSelector('[data-fob-field-name="location"]');
}

async function fillPhoneLocationInput(page: Page, phoneNumber: string) {
  // The location field has a phone input when "Attendee Phone Number" is selected
  await page.waitForSelector(`[data-fob-field-name="location"] input`);
  const locationInput = page.locator(`[data-fob-field-name="location"] input`);

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
