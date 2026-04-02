import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("Settings/admin tests", () => {
  test("should render /settings/admin page", async ({ page, users, context }) => {
    const user = await users.create({
      role: "ADMIN",
    });
    await user.apiLogin();

    await page.goto("/settings/admin");

    await page.waitForLoadState();

    const locator = page.getByRole("heading", { name: "Feature Flags" });

    await expect(locator).toBeVisible();
  });
});
