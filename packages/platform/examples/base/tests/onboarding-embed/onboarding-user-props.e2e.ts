import { test, expect } from "@playwright/test";

import {
  cleanupUser,
  TEST_PASSWORD,
  openOnboardingEmbed,
  waitForLoginForm,
  signUp,
  waitForPersonalSettings,
  verifyPersonalSettingsPrefill,
} from "./helpers";

const ROUTE = "/e2e/onboarding-with-user-props";
const USER = { email: "bob@yahoo.com", name: "Bob", username: "bob100" };

test.describe("Onboarding With User Props", () => {
  test("login page has email prefilled from user prop", async ({ page }) => {
    await page.goto(ROUTE);
    const frame = await openOnboardingEmbed(page);
    await waitForLoginForm(frame);

    const emailInput = frame.locator('input[name="email"]');
    await expect(emailInput).toHaveValue(USER.email);
  });

  test.describe("Profile prefill", () => {
    test.beforeAll(async () => await cleanupUser(USER.email));
    test.afterAll(async () => await cleanupUser(USER.email));

    test("profile onboarding step has name and username prefilled from user prop", async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto(ROUTE);

      const frame = await signUp(page, USER, TEST_PASSWORD);
      await waitForPersonalSettings(frame);
      await verifyPersonalSettingsPrefill(frame, USER);
    });
  });
});
