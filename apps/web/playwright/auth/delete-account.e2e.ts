import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test("Can delete user account", async ({ page, users }) => {
  const deletionPassword = "Deleteme1";
  const user = await users.create({
    username: "delete-me",
    password: deletionPassword,
  });
  await user.apiLogin();
  await page.goto(`/settings/my-account/profile`);
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("[data-testid=dashboard-shell]");

  await page.click("[data-testid=delete-account]");

  expect(user.username).toBeTruthy();

  const $passwordField = page.locator("[data-testid=password]");
  await $passwordField.fill(deletionPassword);

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/auth/logout"),
    page.click("text=Delete my account"),
  ]);

  await expect(page.locator(`[id="modal-title"]`)).toHaveText("You've been logged out");
});