import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Change Password Test", () => {
  test("change password", async ({ page, users }) => {
    const pro = await users.create();
    await pro.login();
    // Go to http://localhost:3000/settings/security
    await page.goto("/settings/security");

    if (!pro.username) throw Error("Test user doesn't have a username");

    // Fill form
    // Wait for selector had to be used as there was a time we tried to fill but element was not ready
    await page.waitForSelector("input[name='current_password']");
    const currentPassword = await page.locator("input[name='current_password']");
    const newPassword = await page.locator("input[name='new_password']");
    await currentPassword.fill(pro.username);
    await newPassword.fill(`${pro.username}1111`);
    await newPassword.press("Enter");

    const toast = await page.waitForSelector("div[class*='data-testid-toast-success']");

    await expect(toast).toBeTruthy();
  });
});
