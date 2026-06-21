import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import { submitAndWaitForResponse, getDefaultPassword } from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Change Password Test", () => {
  test("change password", async ({ page, users }) => {
    const pro = await users.create();
    const currentPassword = getDefaultPassword(String(pro.username))
    await pro.apiLogin();
    // Go to http://localhost:3000/settings/security
    await page.goto("/settings/security/password");

    expect(pro.username).toBeTruthy();

    // Fill form
    await page.locator('[name="oldPassword"]').fill(currentPassword);

    const $newPasswordField = page.locator('[name="newPassword"]');
    await $newPasswordField.fill(`${pro.username}Aa1111`);
    await submitAndWaitForResponse(page, "/api/trpc/auth/changePassword?batch=1", {
      action: () => page.locator("text=Update").click(),
    });
  });
});
