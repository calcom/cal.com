import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { localize } from "./lib/localize";

test.describe.configure({ mode: "parallel" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

test.describe("Smoke tests", () => {

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/event-types");

    await page.waitForURL(/\/auth\/login/);
    await expect(page.locator("[data-testid=login-form]")).toBeVisible();
  });

  test("authenticated user can see event types page", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/event-types");
    await expect(page.locator("[data-testid=dashboard-shell]")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/event-types/);
  });

  test("authenticated user can navigate to settings", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/settings/my-account/profile");
    await expect(page.locator("[data-testid=dashboard-shell]")).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/settings\/my-account\/profile/);
  });
});
