import { test } from "@playwright/test";

test("login with Google", async ({ page }) => {
  if (!process.env.CI_GOOGLE_TEST_USERNAME || !process.env.CI_GOOGLE_TEST_PASSWORD) {
    throw new Error("Please set a test username and password for Google login");
  }

  const username = process.env.CI_GOOGLE_TEST_USERNAME;
  const password = process.env.CI_GOOGLE_TEST_PASSWORD;

  await page.goto(`${process.env.PLAYWRIGHT_TEST_BASE_URL}/auth/login`);

  await page.click("[data-testid=google]");

  await page.waitForNavigation({
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', username);
  await page.click("#identifierNext");
  await page.waitForSelector('input[type="password"]', { state: "visible" });
  await page.type('input[type="password"]', password);
  await page.waitForSelector("#passwordNext", { state: "visible" });
  await page.click("#passwordNext");
  await page.waitForNavigation({
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector("[data-testid=onboarding]");

  // Save signed-in state to 'googleStorageState.json'.
  await page.context().storageState({ path: `playwright/artifacts/googleStorageState.json` });
  await page.context().close();
});
