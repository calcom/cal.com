import { expect, test } from "@playwright/test";

test.describe("Update profile", async () => {
  test.use({ storageState: "playwright/artifacts/proStorageState.json" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/profile");
  });

  test("Update email", async ({ page }) => {
    await page.fill('[name="email"]', "");
    await page.press('[name="email"]', "Enter");
    await expect(page.locator(`text="Email is required"`)).toBeVisible();

    await page.fill('[name="email"]', "trial@example.com");
    await page.press('[name="email"]', "Enter");
    await expect(page.locator('text="A user exists with that email"')).toBeVisible();

    await page.fill('[name="email"]', "prouser@example.com");
    await page.press('[name="email"]', "Enter");
    await expect(page.locator('text="Your user profile has been updated successfully."')).toBeVisible();

    // Let's revert back to prevent errors on other tests
    await page.fill('[name="email"]', "pro@example.com");
    await page.press('[name="email"]', "Enter");
    await expect(page.locator('text="Your user profile has been updated successfully."')).toBeVisible();
  });
});
