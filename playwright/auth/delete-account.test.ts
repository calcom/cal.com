import { expect, test } from "@playwright/test";

test("Can delete user account", async ({ page }) => {
  // Login to account to delete
  await page.goto(`/auth/login`);
  // Click input[name="email"]
  await page.click('input[name="email"]');
  // Fill input[name="email"]
  await page.fill('input[name="email"]', `delete-me@example.com`);
  // Press Tab
  await page.press('input[name="email"]', "Tab");
  // Fill input[name="password"]
  await page.fill('input[name="password"]', "delete-me");
  // Press Enter
  await page.press('input[name="password"]', "Enter");
  await page.waitForSelector("[data-testid=dashboard-shell]");

  await page.goto(`/settings/profile`);
  await page.click("[data-testid=delete-account]");
  expect(page.locator(`[data-testid=delete-account-confirm]`)).toBeVisible();

  await Promise.all([
    page.waitForNavigation({ url: "/auth/logout" }),
    await page.click("[data-testid=delete-account-confirm]"),
  ]);
  expect(page.locator(`[id="modal-title"]`)).toHaveText("You've been logged out");
});
