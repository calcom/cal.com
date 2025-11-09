import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test("Can delete user account", async ({ page, users }) => {
  const user = await users.create({
    username: "delete-me",
  });
  await user.apiLogin();
  await page.goto(`/settings/my-account/profile`);
  await page.waitForSelector("[data-testid=dashboard-shell]");

  await page.click("[data-testid=delete-account]");

  expect(user.username).toBeTruthy();

  const $passwordField = page.locator("[data-testid=password]");
  await $passwordField.fill(String(user.username));

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/auth/logout"),
    page.click("text=Delete my account"),
  ]);

  await expect(page.locator(`[id="modal-title"]`)).toHaveText("You've been logged out");

  // Verify if the account was actually deleted
  await page.goto("/auth/login");
  await page.fill('input[name="email"]', `${user.username}@example.com`);
  await page.fill('input[name="password"]', user.username);
  await page.click('button[type="submit"]');
  await expect(page.locator("text=Email or password is incorrect.")).toBeVisible();
});
