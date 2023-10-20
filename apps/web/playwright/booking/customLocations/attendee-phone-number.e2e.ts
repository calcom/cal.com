import { expect } from "@playwright/test";

import { login } from "../../fixtures/users";
import { test } from "../../lib/fixtures";
import { getByExactText, verifyTextVisibility } from "./customLocationsUtils";

test.describe("Custom Cases For Attendee Phone Number Location", () => {
  test("Attendee Phone Number", async ({ page }) => {
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    await page.goto("/event-types");

    // eslint-disable-next-line playwright/no-conditional-in-test
    if (await page.getByRole("button", { name: "Update timezone" }).isVisible()) {
      page.getByRole("button", { name: "Update timezone" }).click();
    }

    // Create a new event type
    await page.getByTestId("new-event-type").click();
    await page.getByPlaceholder("Quick Chat").click();
    await page.getByPlaceholder("Quick Chat").fill("15 min test Attendee Phone Number location");
    await page.getByRole("button", { name: "Continue" }).click();

    // Select Attendee Phone Number location and check if the correct text is displayed
    await page.locator("#location-select").click();
    await getByExactText(page, "Attendee Phone Number").click();
    verifyTextVisibility(page, "Attendee Phone Number");
    await page.getByTestId("update-eventtype").click();
    const page3Promise = page.waitForEvent("popup");
    await page.getByTestId("preview-button").click();
    const page3 = await page3Promise;

    // Check if the correct text is displayed in the preview page
    await expect(page3.getByText("Attendee Phone Number").last()).toBeVisible();
    await page3.getByTestId("time").first().click();
    await page3.getByPlaceholder("Enter phone number").click();
    await page3.getByPlaceholder("Enter phone number").clear();
    await page3.getByPlaceholder("Enter phone number").fill("+55 (32) 9748672848");
    await expect(page3.getByRole("paragraph").filter({ hasText: "Attendee Phone Number" })).toBeVisible();

    await page3.getByTestId("confirm-book-button").click();
    await page3.goto("/event-types");

    await page3
      .getByRole("link", {
        name: "15 min test Attendee Phone Number",
      })
      .first()
      .click();
    await page3
      .locator("header")
      .filter({ hasText: "15 min test Attendee Phone Number locationSave" })
      .getByRole("button")
      .nth(2)
      .click();
    await page3.getByRole("button", { name: "Yes, delete" }).click();

    // Cancel the meeting in upcoming bookings page
    await page3.getByRole("link", { name: "Bookings" }).click();
    await page3
      .getByRole("row", {
        name: "15 min test Attendee Phone Number location between Pro Example and Pro Example You and Pro Example Cancel Edit",
      })
      .first()
      .getByTestId("cancel")
      .click();
    await page3.getByTestId("confirm_cancel").click();
    await expect(page3.getByTestId("cancelled-headline")).toBeVisible();
  });
});
