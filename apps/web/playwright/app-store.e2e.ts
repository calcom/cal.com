import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { installAppleCalendar } from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

test.afterEach(({ users }) => users.deleteAll());

test.describe("App Store - Authed", () => {
  test("should render /apps page", async ({ page, users, context }) => {
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

  test("Can add Google calendar from the app store", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/apps/google-calendar");

    await page.getByTestId("install-app-button").click();

    await page.waitForNavigation();

    await expect(page.url()).toContain("accounts.google.com");
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

  test("Can add Adyen payment app from the app store", async ({ page, users }) => {
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/apps/adyen");
    await page.getByTestId("install-app-button").click();
    await page.waitForURL("/apps/installation/accounts?slug=adyen");
    await page.getByTestId("install-app-button-personal").click();
    await page.waitForURL("/apps/adyen/setup");
    await page.getByTestId("connect-with-adyen").click();
    await page.waitForNavigation();

    await expect(page.url()).toContain("adyen.com");
  });
});

test.describe("App Store - Unauthed", () => {
  test("Browse apple-calendar and try to install", async ({ page }) => {
    await installAppleCalendar(page);

    await expect(page.locator(`[data-testid="login-form"]`)).toBeVisible();
  });
});
