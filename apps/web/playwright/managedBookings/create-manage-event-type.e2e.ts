import { expect } from "@playwright/test";

import { loginUser } from "../fixtures/bookingPage";
import { test } from "../lib/fixtures";

test.describe("Create a Managed Event Type", () => {
  test("Check if the event type is showed correctly", async ({ page, bookingPage, users }) => {
    await loginUser(users);
    await page.goto("/event-types");
    await bookingPage.createTeam("Test Team");
    await bookingPage.goToTab("Back");
    await bookingPage.createManagedEventType("Test Managed Event Type");
    await bookingPage.goToEventType("Event Types");
    await expect(
      page.getByRole("link", {
        name: "Test Managed Event Type",
      })
    ).toBeVisible();
    await bookingPage.goToEventType("Test Managed Event", { clickOnFirst: true });
    await bookingPage.removeManagedEventType();
    await bookingPage.deleteTeam();
  });
});
