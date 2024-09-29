import { expect } from "@playwright/test";

import { isSAMLLoginEnabled } from "@calcom/features/ee/sso/lib/saml";
import { IS_PREMIUM_USERNAME_ENABLED } from "@calcom/lib/constants";

import { login } from "./fixtures/users";
import { test } from "./lib/fixtures";

test.describe("SAML tests", () => {
  test("test SAML configuration UI with pro@example.com", async ({ page }) => {
    // TODO: Figure out a way to use the users from fixtures here, right now we cannot set
    // the SAML_ADMINS env variables dynamically
    await login({ username: "pro", email: "pro@example.com", password: "pro" }, page);
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!isSAMLLoginEnabled, "Skipping due to SAML login being disabled");
    // Try to go Security page
    await page.goto("/settings/security/sso");
    // It should redirect you to the event-types page
    // await page.waitForSelector("[data-testid=saml_config]");
  });

  test.describe("SAML Signup Flow Test", async () => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!isSAMLLoginEnabled, "Skipping due to SAML login being disabled");

    test("Submit button should be disabled without username", async ({ page }) => {
      await page.goto("/signup");
      await page.getByTestId("continue-with-saml-button").click();
      await page.locator('input[name="email"]').fill("tester123@example.com");
      const submitButton = page.getByTestId("saml-submit-button");
      await expect(submitButton).not.toBeEnabled();
    });

    test("Submit button should be disabled without email", async ({ page }) => {
      await page.goto("/signup");
      await page.getByTestId("continue-with-saml-button").click();
      await page.locator('input[name="username"]').fill("tester123");
      const submitButton = page.getByTestId("saml-submit-button");
      await expect(submitButton).not.toBeEnabled();
    });

    test("Password input should not exist", async ({ page }) => {
      await page.goto("/signup");
      await page.getByTestId("continue-with-saml-button").click();

      await expect(page.locator('input[name="password"]')).not.toBeVisible();
    });

    test("Checkbox for cookie consent does not need to be checked", async ({ page }) => {
      await page.goto("/signup");

      // Navigate to email form
      await page.getByTestId("continue-with-saml-button").click();

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
  });

  test("Should navigate user to another URL", async ({ page }) => {
    await page.goto("/signup");

    // Navigate to email form
    await page.getByTestId("continue-with-saml-button").click();

    // Fill form
    const username = "tester123";
    const email = "tester123@example.com";
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="email"]').fill(email);

    // Submit form
    const submitButton = page.getByTestId("saml-submit-button");
    await submitButton.click();
    const sp = new URLSearchParams();
    sp.set("username", username);
    sp.set("email", email);
    await page.waitForURL(`/auth/sso/saml?${sp.toString()}`);
  });

  test("Submit button should be disabled with a premium username", async ({ page }) => {
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(!IS_PREMIUM_USERNAME_ENABLED, "Only run on Cal.com");
    await page.goto("/signup");

    // Navigate to email form
    await page.getByTestId("continue-with-saml-button").click();

    // Fill form
    await page.locator('input[name="username"]').fill("pro");
    await page.locator('input[name="email"]').fill("pro@example.com");

    // Submit form
    const submitButton = page.getByTestId("saml-submit-button");
    await expect(submitButton).not.toBeEnabled();
  });
});
