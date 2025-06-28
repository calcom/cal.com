import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("apps/ A/B tests", () => {
  test("should render the /apps/installed/[category]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/installed/messaging");

    const locator = page.getByRole("heading", { name: "Messaging" });

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/[slug]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/telegram");

    const locator = page.getByRole("heading", { name: "Telegram" });

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/[slug]/setup", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/apple-calendar/setup");

    const locator = page.getByRole("heading", { name: "Connect to Apple Server" });

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/categories", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/categories");

    const locator = page.getByTestId("app-store-category-messaging");

    await expect(locator).toBeVisible();
  });

  test("should render the /apps/categories/[category]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/apps/categories/messaging");

    const locator = page.getByText(/messaging apps/i);

    await expect(locator).toBeVisible();
  });

  test("should render the /bookings/[status]", async ({ page, users }) => {
    const user = await users.create();

    await user.apiLogin();

    await page.goto("/bookings/upcoming/");

    const locator = page.getByTestId("horizontal-tab-upcoming");

    await expect(locator).toBeDefined();
  });

  test("should render the /getting-started", async ({ page, users }) => {
    const user = await users.create({ completedOnboarding: false, name: null });

    await user.apiLogin();

    await page.goto("/getting-started/connected-calendar");

    const locator = page.getByText("Apple Calendar");

    await expect(locator).toBeVisible();
  });
});
