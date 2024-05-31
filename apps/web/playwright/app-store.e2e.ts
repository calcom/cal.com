import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { testBothFutureAndLegacyRoutes } from "./lib/future-legacy-routes";
import { installAppleCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

testBothFutureAndLegacyRoutes.describe("App Store - Authed", (routeVariant) => {
  test("should render /apps page", async ({ page, users, context }) => {
    test.skip(routeVariant === "future", "Future route not ready yet");
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/");

    await page.waitForLoadState();

    const locator = page.getByRole("heading", { name: "App Store" });

    await expect(locator).toBeVisible();
  });

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
