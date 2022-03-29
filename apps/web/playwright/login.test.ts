import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Login tests", () => {
  // Using logged in state from globalSteup
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test("Login with pro@example.com", async ({ page }) => {
    // Try to go homepage
    await page.goto("/");
    // It should redirect you to the event-types page
    await page.waitForSelector("[data-testid=event-types]");
  });

  test("Should logout using the logout path", async ({ page, users }) => {
    // creates a user and login
    const pro = await users.create();
    await pro.login();

    // users.logout() action uses the logout route "/auth/logout" to clear the session
    await users.logout();

    // check if we are at the login page
    await page.goto("/");
    await expect(page.locator(`[data-testid=login-form]`)).toBeVisible();
  });
});
