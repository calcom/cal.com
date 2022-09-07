import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Change Passsword Test", () => {
  test("change password", async ({ page, users }) => {
    const pro = await users.create();
    await pro.login();
    // Go to http://localhost:3000/settings/security
    await page.goto("/settings/security");

    if (!pro.username) throw Error("Test user doesn't have a username");

    // Fill form
    await page.locator('[name="current_password"]').fill(pro.username);
    await page.locator('[name="new_password"]').fill(`${pro.username}1111`);
    await page.press('[name="new_password"]', "Enter");

    await expect(page.locator(`text=Your password has been successfully changed.`)).toBeVisible();
  });
});
