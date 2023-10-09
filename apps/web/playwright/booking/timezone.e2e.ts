import { expect } from "@playwright/test";

import { login } from "../fixtures/users";
import { test } from "../lib/fixtures";
import { loginUser } from "./utils/bookingUtils.e2e";

test.describe("Test the timezone behavior in specific cases", () => {
  test("Change timezone in settings", async ({ page, users }) => {
    loginUser(page, users);
    const settingsPage = page;
    await settingsPage.getByRole("link", { name: "Settings" }).click();
    await settingsPage.getByTestId("vertical-tab-General").click();
    await settingsPage.locator("#timezone svg").click();
    await settingsPage.getByTestId("select-option-America/New_York").click();
    await settingsPage.getByRole("button", { name: "Update" }).click();
    await settingsPage.getByRole("button", { name: "Don't update" }).click();
    await expect(settingsPage.locator("div").filter({ hasText: "America/New York" }).nth(1)).toBeVisible();
  });

  test("Change timezone in booking page", async ({ page }) => {
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    const eventTypesPage = page;
    await eventTypesPage.goto("/event-types");

    // eslint-disable-next-line playwright/no-conditional-in-test
    if (await eventTypesPage.getByRole("button", { name: "Update timezone" }).isVisible()) {
      eventTypesPage.getByRole("button", { name: "Update timezone" }).click();
    }

    // Create a new event type
    await eventTypesPage.getByTestId("new-event-type").click();
    await eventTypesPage.getByPlaceholder("Quick Chat").click();
    await eventTypesPage.getByPlaceholder("Quick Chat").fill("15 min test timezone");
    await eventTypesPage.getByRole("button", { name: "Continue" }).dblclick();
    await eventTypesPage.getByTestId("update-eventtype").click();

    // Schedule a booking changing the timezone to America/New_York
    await eventTypesPage.getByTestId("preview-button").click();
    const bookingPagePromise = eventTypesPage.waitForEvent("popup");
    const bookingPage = await bookingPagePromise;
    await bookingPage.locator("span").filter({ hasText: "/" }).locator("svg").first().click();
    await bookingPage.getByTestId("select-option-America/New_York").click();
    await expect(bookingPage.locator("div").filter({ hasText: "America/New York" }).first()).toBeVisible();
    await bookingPage.getByTestId("time").first().click();

    // Check if the correct timezone is displayed
    await expect(bookingPage.getByText("America/New_York")).toBeVisible();
    await bookingPage.getByTestId("confirm-book-button").click();

    // Check if the meeting was scheduled successfully
    await expect(bookingPage.getByText("This meeting is scheduled")).toBeVisible();

    await bookingPage.getByRole("link", { name: "Back to bookings" }).click();
    const upcomingBookingsPage = bookingPage;

    // Check if the icon globe is displayed in the bookings page and if the correct timezone is displayed when we click on it
    await upcomingBookingsPage.getByRole("link", { name: "m - " }).first().hover();
    await upcomingBookingsPage.getByRole("link", { name: "m - " }).first().getByRole("button").click();
    await expect(upcomingBookingsPage.getByText("America/New_York")).toBeVisible();

    // Delete the event-type
    await upcomingBookingsPage.getByRole("link", { name: "Event Types" }).click();

    await upcomingBookingsPage
      .getByRole("link", { name: "15 min test timezone/pro/15-min-test-timezone 15m" })
      .click();
    await upcomingBookingsPage
      .locator("header")
      .filter({ hasText: "15 min test timezoneSave" })
      .getByRole("button")
      .nth(2)
      .click();
    await upcomingBookingsPage.getByRole("button", { name: "Yes, delete" }).click();

    // Cancel the meeting in upcoming bookings page
    await upcomingBookingsPage.getByRole("link", { name: "Bookings" }).click();
    await upcomingBookingsPage
      .getByRole("row", {
        name: " 15 min test timezone between Pro Example and Pro Example You and Pro Example Cancel Edit",
      })
      .getByTestId("cancel")
      .first()
      .click();
    await upcomingBookingsPage.getByTestId("confirm_cancel").click();
  });
});
