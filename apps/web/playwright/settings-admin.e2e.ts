import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Settings/admin A/B tests", () => {
  test.skip("should point to the /future/settings/admin page", async ({ page, users, context }) => {
    await context.addCookies([
      {
        name: "x-calcom-future-routes-override",
        value: "1",
        url: "http://localhost:3000",
      },
    ]);
    const user = await users.create();
    await user.apiLogin();

    await page.goto("/settings/admin");

    await page.waitForLoadState();

    const dataNextJsRouter = await page.evaluate(() =>
      window.document.documentElement.getAttribute("data-nextjs-router")
    );

    expect(dataNextJsRouter).toEqual("app");

    const locator = page.getByRole("heading", { name: "Feature Flags" });

    await expect(locator).toBeVisible();
  });
});
