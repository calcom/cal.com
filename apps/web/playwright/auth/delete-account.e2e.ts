import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";

test("Can delete user account", async ({ page, users }) => {
  const user = await users.create({
    username: "delete-me",
  });
  await user.login();

  await page.waitForSelector("[data-testid=dashboard-shell]");

  await page.goto(`/settings/profile`);
  await page.click("[data-testid=delete-account]");
  await expect(page.locator(`[data-testid=delete-account-confirm]`)).toBeVisible();
  if (!user.username) throw Error(`Test user doesn't have a username`);
  await page.fill("[data-testid=password]", user.username);

  await Promise.all([
    page.waitForNavigation({ url: "/auth/logout" }),
    page.click("[data-testid=delete-account-confirm]"),
  ]);

  await expect(page.locator(`[id="modal-title"]`)).toHaveText("You've been logged out");
});
