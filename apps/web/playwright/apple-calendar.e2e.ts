import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe("adding apple calendar", async () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.login();
  });

  test.afterAll(async ({ users }) => {
    await users.deleteAll();
  });

  test("Apple calendar got installed ", async ({ page }) => {
    await page.goto("/apps/categories/calendar");
    await page.waitForURL("/apps/categories/calendar");
    await page.click("//a[@data-testid='app-store-app-card-apple-calendar']");
    await expect(page.locator("h1")).toHaveText("Apple Calendar");
    await expect(page.locator("//button[text()='Install another']")).toBeVisible();
  });

  test("Navigating to the installed apps", async ({ page }) => {
    await page.goto("/apps/installed/calendar");
    await page.waitForURL("/apps/installed/calendar");
    await page.getByRole("menu", { name: "Add" }).click();
    await expect(page.locator("//span[text()='Add Apple Calendar']")).toBeVisible();
  });
});
