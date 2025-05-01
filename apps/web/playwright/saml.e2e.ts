import { expect } from "@playwright/test";

import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";

import { login } from "./fixtures/users";
import { test } from "./lib/fixtures";

test.describe.configure({ mode: "parallel" });

test.describe("SAML tests", () => {
  // eslint-disable-next-line playwright/no-skipped-test
  test.skip(!isSAMLLoginEnabled, "Skipping due to SAML login being disabled");

  test("test SAML configuration UI with pro@example.com", async ({ page }) => {
    // TODO: Figure out a way to use the users from fixtures here, right now we cannot set
    // the SAML_ADMINS env variables dynamically
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    const shellLocator = page.locator(`[data-testid=dashboard-shell]`);
    await page.waitForURL("/event-types");
    await expect(shellLocator).toBeVisible();
    // eslint-disable-next-line playwright/no-skipped-test
    // Try to go Security page
    await page.goto("/settings/security/sso");
    // It should redirect you to the event-types page
    // await page.waitForSelector("[data-testid=saml_config]");
  });

  test.describe("SAML Signup Flow Test", async () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/signup");
      await expect(page.locator("text=Create your account")).toBeVisible(); // this prevents flaky test
      await page.getByTestId("continue-with-saml-button").click();
      await page.waitForSelector('[data-testid="saml-submit-button"]');
    });

    test("Submit button should be disabled without username", async ({ page }) => {
      await page.locator('input[name="email"]').fill("tester123@example.com");
      const submitButton = page.getByTestId("saml-submit-button");
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });

    test("Submit button should be disabled without email", async ({ page }) => {
      await page.locator('input[name="username"]').fill("tester123");
      const submitButton = page.getByTestId("saml-submit-button");
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });

    test("Password input should not exist", async ({ page }) => {
      await expect(page.locator('input[name="password"]')).toBeHidden();
    });

    test("Checkbox for cookie consent does not need to be checked", async ({ page }) => {
      // Fill form
      await page.locator('input[name="username"]').fill("tester123");
      await page.locator('input[name="email"]').fill("tester123@example.com");

      const submitButton = page.getByTestId("saml-submit-button");
      const checkbox = page.getByTestId("signup-cookie-content-checkbox");

      await checkbox.check();
      await expect(submitButton).toBeEnabled();

      // the cookie consent checkbox does not need to be checked for user to proceed
      await checkbox.uncheck();
      await expect(submitButton).toBeEnabled();
    });

    test("Submit button should be disabled with a premium username", async ({ page }) => {
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip(!IS_PREMIUM_USERNAME_ENABLED, "Only run on Cal.com");

      // Fill form
      await page.locator('input[name="username"]').fill("pro");
      await page.locator('input[name="email"]').fill("pro@example.com");

      // Submit form
      const submitButton = page.getByTestId("saml-submit-button");
      await expect(submitButton).toBeDisabled();
    });
  });
});
