import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { testBothFutureAndLegacyRoutes } from "./lib/future-legacy-routes";

test.describe.configure({ mode: "parallel" });

const ensureAppDir = async (page: Page) => {
  const dataNextJsRouter = await page.evaluate(() =>
    window.document.documentElement.getAttribute("data-nextjs-router")
  );

  expect(dataNextJsRouter).toEqual("app");
};

testBothFutureAndLegacyRoutes.describe("apps/ A/B tests", (routeVariant) => {
  test("should render the /apps/installed/[category]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/installed/messaging");

    const locator = page.getByRole("heading", { name: "Messaging" });

    if (routeVariant === "future") {
      await ensureAppDir(page);
    }

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/[slug]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/telegram");

    const locator = page.getByRole("heading", { name: "Telegram" });

    if (routeVariant === "future") {
      await ensureAppDir(page);
    }

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/[slug]/setup", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/apple-calendar/setup");

    const locator = page.getByRole("heading", { name: "Connect to Apple Server" });

    if (routeVariant === "future") {
      await ensureAppDir(page);
    }

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/categories", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/categories");

    const locator = page.getByTestId("app-store-category-messaging");

    if (routeVariant === "future") {
      await ensureAppDir(page);
    }

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/categories/[category]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/categories/messaging");

    const locator = page.getByText(/messaging apps/i);

    if (routeVariant === "future") {
      await ensureAppDir(page);
    }

    await expect(locator).toBeVisible();
  });

  test("should render the /bookings/[status]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/bookings/upcoming/");

    const locator = page.getByTestId("horizontal-tab-upcoming");

    if (routeVariant === "future") {
      await ensureAppDir(page);
    }

    await expect(locator).toHaveClass(/bg-emphasis/);
  });

  test("should render the /getting-started", async ({ page, users }) => {
    const user = await users.create({ completedOnboarding: false, name: null });

    await user.apiLogin();

    await page.goto("/getting-started/connected-calendar");

    const locator = page.getByText("Apple Calendar");

    if (routeVariant === "future") {
      await ensureAppDir(page);
    }

    await expect(locator).toBeVisible();
  });
});
