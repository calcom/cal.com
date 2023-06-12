import { expect } from "@playwright/test";

import { GOOGLE_API_CREDENTIALS } from "../server/lib/constants";
import { test } from "./lib/fixtures";

test.describe("adding goggle calendar", async () => {
  test.beforeEach(async ({ page, users }) => {
    const user = await users.create();
    await user.login();
  });

  test.afterAll(async ({ users }) => {
    await users.deleteAll();
  });

  test("Is google calendar installed ", async ({ page }) => {
    test.skip(!GOOGLE_API_CREDENTIALS, "It should only run if Google API credetials are present");
    await page.goto("/apps/categories/calendar");
    await page.waitForURL("/apps/categories/calendar");
    await page.click("//a[@data-testid='app-store-app-card-google-calendar']");
    await expect(page.locator("h1")).toHaveText("Google Calendar");
    await expect(page.locator("//button[text()='Install another']")).toBeVisible();
  });

  test("If google calendar ", async ({ page }) => {
    test.skip(!GOOGLE_API_CREDENTIALS, "It should only run if Google API credetials are present");
    await page.goto("/apps/installed/calendar");
    await page.waitForURL("/apps/installed/calendar");
    await page.getByRole("menu", { name: "Add" }).click();
    await expect(page.getByRole("button", { name: "Google Calendar Add Google Calendar" })).toBeVisible();
  });
});
