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
    await page.waitForSelector('[name="current_password"]');
    await page.fill('[name="current_password"]', pro.username);
    await page.fill('[name="new_password"]', `${pro.username}1111`);
    await page.press('[name="new_password"]', "Enter");

    const toast = await page.waitForSelector("div[class*='data-testid-toast-success']");

    await expect(toast).toBeTruthy();
  });
});
