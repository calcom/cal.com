import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { installAppleCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("App Store - Authed", () => {
  test("Browse apple-calendar and try to install", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();

    await installAppleCalendar(page);

    await expect(page.locator(`text=Connect to Apple Server`)).toBeVisible();
  });

  test("Installed Apps - Navigation", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();
    await page.goto("/apps/installed");
    await page.waitForSelector('[data-testid="connect-calendar-apps"]');
    await page.click('[data-testid="vertical-tab-payment"]');
    await page.waitForSelector('[data-testid="connect-payment-apps"]');
    await page.click('[data-testid="vertical-tab-automation"]');
    await page.waitForSelector('[data-testid="connect-automation-apps"]');
  });
});

test.describe("App Store - Unauthed", () => {
  test("Browse apple-calendar and try to install", async ({ page }) => {
    await installAppleCalendar(page);

    await expect(page.locator(`[data-testid="login-form"]`)).toBeVisible();
  });
});
