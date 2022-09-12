import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("App Store - Authed", () => {
  test("Browse apple-calendar and try to install", async ({ page, users }) => {
    const pro = await users.create();
    await pro.login();
    await page.goto("/apps");
    await page.click('[data-testid="app-store-category-calendar"]');
    await page.click('[data-testid="app-store-app-card-apple-calendar"]');
    await page.click('[data-testid="install-app-button"]');
    await expect(page.locator(`text=Connect to Apple Server`)).toBeVisible();
    await pro.delete();
  });
});

test.describe("App Store - Unauthed", () => {
  test("Browse apple-calendar and try to install", async ({ page }) => {
    await page.goto("/apps");
    await page.waitForSelector("[data-testid=dashboard-shell]");
    await page.click('[data-testid="app-store-category-calendar"]');
    await page.click('[data-testid="app-store-app-card-apple-calendar"]');
    await page.click('[data-testid="install-app-button"]');
    await expect(page.locator(`[data-testid="login-form"]`)).toBeVisible();
  });
});
