import { expect } from "@playwright/test";

import { test } from "../lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test("Can delete user account", async ({ page, users }) => {
  const user = await users.create({
    username: "delete-me",
  });
  await user.login();

  await page.waitForSelector("[data-testid=dashboard-shell]");

  await page.goto(`/settings/my-account/profile`);
  await page.click("[data-testid=delete-account]");
  if (!user.username) throw Error(`Test user doesn't have a username`);

  const $passwordField = page.locator("[data-testid=password]");
  await $passwordField.fill(user.username);

  await Promise.all([page.waitForNavigation({ url: "/auth/logout" }), page.click("text=Delete my account")]);

  await expect(page.locator(`[id="modal-title"]`)).toHaveText("You've been logged out");
});
