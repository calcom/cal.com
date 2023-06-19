import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("Can add Apple Calendar", async () => {
  test.beforeEach(async ({ users }) => {
    const user = await users.create();
    await user.login();
  });

  test.afterAll(async ({ users }) => {
    await users.deleteAll();
  });

  test("Install Apple calendar", async ({ page }) => {
    await page.goto("/apps/categories/calendar");
    await page.waitForURL("/apps/categories/calendar");
    await page.click("//a[@data-testid='app-store-app-card-apple-calendar']");
    await page.waitForURL("/apps/apple-calendar");
    await page.click('[data-testid="install-app-button"]');
    await expect(page.locator(`text=Connect to Apple Server`)).toBeVisible();
  });
});
