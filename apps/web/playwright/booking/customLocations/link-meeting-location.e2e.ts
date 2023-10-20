import { expect } from "@playwright/test";

import { login } from "../../fixtures/users";
import { test } from "../../lib/fixtures";
import { getByExactText, verifyTextVisibility } from "./customLocationsUtils";

test.describe("Custom Cases For Link Meeting Location", () => {
  test("Link Meeting - Display on booking page = true", async ({ page }) => {
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    await page.goto("/event-types");

    // eslint-disable-next-line playwright/no-conditional-in-test
    if (await page.getByRole("button", { name: "Update timezone" }).isVisible()) {
      page.getByRole("button", { name: "Update timezone" }).click();
    }

    // Create a new event type
    await page.getByTestId("new-event-type").click();
    await page.getByPlaceholder("Quick Chat").click();
    await page.getByPlaceholder("Quick Chat").fill("15 min test Link Meeting location");
    await page.getByRole("button", { name: "Continue" }).click();

    // Select Meeting Link location and check if the correct text is displayed
    await page.locator("#location-select").click();
    await getByExactText(page, "Link meeting").click();
    await page.getByLabel("Provide a Meeting Link").dblclick();
    await page.getByLabel("Provide a Meeting Link").fill("Test Link Meeting");
    await page.getByTestId("update-location").click();

    // Check if the Invalid URL warning is showing correctly
    await expect(page.getByText("Invalid URL")).toBeVisible();
    await page.getByLabel("Provide a Meeting Link").fill("https:test.com");

    // Select the display location checkbox to check if the correct text for this case is displayed
    await page.getByTestId("display-location").check();
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "Link Meeting");
    await page.getByTestId("update-eventtype").click();
    const page3Promise = page.waitForEvent("popup");
    await page.getByTestId("preview-button").click();
    const page3 = await page3Promise;

    // Check if the correct text is displayed in the preview page
    await expect(page3.getByText("Link Meeting").last()).toBeVisible();
    await page3.getByTestId("time").first().click();
    await expect(page3.getByRole("paragraph").filter({ hasText: "https:test.com" })).toBeVisible();

    await page3.getByTestId("confirm-book-button").click();
    await page3.goto("/event-types");

    await page3
      .getByRole("link", {
        name: "15 min test Link Meeting",
      })
      .first()
      .click();
    await page3
      .locator("header")
      .filter({ hasText: "15 min test Link Meeting locationSave" })
      .getByRole("button")
      .nth(2)
      .click();
    await page3.getByRole("button", { name: "Yes, delete" }).click();

    // Cancel the meeting in upcoming bookings page
    await page3.getByRole("link", { name: "Bookings" }).click();
    await page3
      .getByRole("row", {
        name: "15 min test Link Meeting location between Pro Example and Pro Example You and Pro Example Cancel Edit",
      })
      .first()
      .getByTestId("cancel")
      .click();
    await page3.getByTestId("confirm_cancel").click();
    await expect(page3.getByTestId("cancelled-headline")).toBeVisible();
  });

  test("Link Meeting - Display on booking page = false", async ({ page }) => {
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    await page.goto("/event-types");

    // eslint-disable-next-line playwright/no-conditional-in-test
    if (await page.getByRole("button", { name: "Update timezone" }).isVisible()) {
      page.getByRole("button", { name: "Update timezone" }).click();
    }

    // Create a new event type
    await page.getByTestId("new-event-type").click();
    await page.getByPlaceholder("Quick Chat").click();
    await page.getByPlaceholder("Quick Chat").fill("15 min test Link Meeting location");
    await page.getByRole("button", { name: "Continue" }).click();

    // Select Meeting Link location and check if the correct text is displayed
    await page.locator("#location-select").click();
    await getByExactText(page, "Link meeting").click();
    await page.getByLabel("Provide a Meeting Link").dblclick();
    await page.getByLabel("Provide a Meeting Link").fill("Test Link Meeting");
    await page.getByTestId("update-location").click();

    // Check if the Invalid URL warning is showing correctly
    await expect(page.getByText("Invalid URL")).toBeVisible();
    await page.getByLabel("Provide a Meeting Link").fill("https:test.con");
    await page.getByTestId("update-location").click();
    verifyTextVisibility(page, "Link Meeting");
    await page.getByTestId("update-eventtype").click();
    const page3Promise = page.waitForEvent("popup");
    await page.getByTestId("preview-button").click();
    const page3 = await page3Promise;

    // Check if the correct text is displayed in the preview page
    await expect(page3.getByText("Link Meeting").last()).toBeVisible();
    await page3.getByTestId("time").first().click();
    await expect(page3.getByRole("paragraph").filter({ hasText: "Link Meeting" })).toBeVisible();

    await page3.getByTestId("confirm-book-button").click();
    await page3.goto("/event-types");

    await page3
      .getByRole("link", {
        name: "15 min test Link Meeting",
      })
      .first()
      .click();
    await page3
      .locator("header")
      .filter({ hasText: "15 min test Link Meeting locationSave" })
      .getByRole("button")
      .nth(2)
      .click();
    await page3.getByRole("button", { name: "Yes, delete" }).click();

    // Cancel the meeting in upcoming bookings page
    await page3.getByRole("link", { name: "Bookings" }).click();
    await page3
      .getByRole("row", {
        name: "15 min test Link Meeting location between Pro Example and Pro Example You and Pro Example Cancel Edit",
      })
      .first()
      .getByTestId("cancel")
      .click();
    await page3.getByTestId("confirm_cancel").click();
    await expect(page3.getByTestId("cancelled-headline")).toBeVisible();
  });
});
