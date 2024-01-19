import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { installAppleCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("App Store - Authed", () => {
  test("should point to the /future/apps/", async ({ page, users, context }) => {
    await context.addCookies([
      {
        name: "x-calcom-future-routes-override",
        value: "1",
        url: "http://localhost:3000",
      },
    ]);
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/");

    await page.waitForLoadState();

    const dataNextJsRouter = await page.evaluate(() =>
      window.document.documentElement.getAttribute("data-nextjs-router")
    );

    expect(dataNextJsRouter).toEqual("app");

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
