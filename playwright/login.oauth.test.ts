import { expect, test } from "@playwright/test";

import { IS_GOOGLE_LOGIN_ENABLED, IS_SAML_LOGIN_ENABLED } from "../server/lib/constants";

test("Should display Google Login button", async ({ page }) => {
  test.skip(!IS_GOOGLE_LOGIN_ENABLED, "It should only run if Google Login is installed");

  await page.goto(`${process.env.PLAYWRIGHT_TEST_BASE_URL}/auth/login`);

  await expect(page.locator(`[data-testid=google]`)).toBeVisible();
});

test("Should display SAML Login button", async ({ page }) => {
  test.skip(!IS_SAML_LOGIN_ENABLED, "It should only run if SAML Login is installed");

  await page.goto(`${process.env.PLAYWRIGHT_TEST_BASE_URL}/auth/login`);

  await expect(page.locator(`[data-testid=saml]`)).toBeVisible();
});
