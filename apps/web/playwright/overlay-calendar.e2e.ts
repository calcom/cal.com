import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("User can overlay their calendar", async () => {
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });

  test("Continue with Cal.com flow", async ({ page, users }) => {
    await users.create({
      username: "overflow-user-test-1",
      useExactUsername: true,
    });
    await test.step("toggles overlay without a session", async () => {
      await page.goto("/overflow-user-test-1/30-min");
      const switchLocator = page.locator(`[data-testid=overlay-calendar-switch]`);
      await switchLocator.click();
      const continueWithCalCom = page.locator(`[data-testid=overlay-calendar-continue-button]`);
      await expect(continueWithCalCom).toBeVisible();
      await continueWithCalCom.click();
    });
    // log in trail user
    await test.step("Log in and return to booking page", async () => {
      const user = await users.create();
      await user.login();
      // Expect page to be redirected to the test users booking page
      await page.waitForURL(/\/overflow-user-test-1\/30-min(\?.*)?$/);
    });
    await test.step("Expect settings cog to be visible when session exists", async () => {
      const settingsCog = page.locator(`[data-testid=overlay-calendar-settings-button]`);
      await expect(settingsCog).toBeVisible();
    });
    await test.step("Settings should show no calendars connected", async () => {
      const settingsCog = page.locator(`[data-testid=overlay-calendar-settings-button]`);
      await settingsCog.click();
      const emptyScreenLocator = page.locator(`[data-testid=empty-screen]`);
      await expect(emptyScreenLocator).toBeVisible();
    });
  });
});
