import { test } from "@playwright/test";

test("Test OAuth login buttons", async ({ page }) => {
  await page.goto(`${process.env.PLAYWRIGHT_TEST_BASE_URL}/auth/login`);

  // Check for Google login button, then click through and check for email field
  await page.waitForSelector("[data-testid=google]");

  await page.click("[data-testid=google]");

  await page.waitForNavigation({
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('input[type="email"]');

  await page.goto(`${process.env.PLAYWRIGHT_TEST_BASE_URL}/auth/login`);

  await page.waitForSelector("[data-testid=saml]");

  // Check for SAML login button, then click through
  await page.click("[data-testid=saml]");

  await page.waitForNavigation({
    waitUntil: "domcontentloaded",
  });

  await page.context().close();
});
