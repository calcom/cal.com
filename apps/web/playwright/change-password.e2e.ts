import { expect } from "@playwright/test";
import { test } from "./lib/fixtures";
import { submitAndWaitForResponse } from "./lib/testUtils";

test.afterEach(({ users }) => users.deleteAll());

test.describe("Change Password Test", () => {
  test("change password", async ({ page, users }) => {
    const pro = await users.create();
    await pro.apiLogin();
    // Go to http://localhost:3000/settings/security
    await page.goto("/settings/security/password");

    expect(pro.username).toBeTruthy();

    // Fill form
    await page.locator('[name="oldPassword"]').fill(String(pro.username));

    const $newPasswordField = page.locator('[name="newPassword"]');
    $newPasswordField.fill(`${pro.username}Aa1111`);
    await submitAndWaitForResponse(page, "/api/trpc/auth/changePassword?batch=1", {
      action: () => page.locator("text=Update").click(),
    });
  });
});
