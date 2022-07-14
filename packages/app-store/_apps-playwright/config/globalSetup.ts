import { Page } from "@playwright/test";

export async function loginAsUser(username: string, page: Page) {
  // Skip if file exists
  await page.goto(`${process.env.PLAYWRIGHT_TEST_BASE_URL}/auth/login`);
  // Click input[name="email"]
  await page.click('input[name="email"]');
  // Fill input[name="email"]
  await page.fill('input[name="email"]', `${username}@example.com`);
  // Press Tab
  await page.press('input[name="email"]', "Tab");
  // Fill input[name="password"]
  await page.fill('input[name="password"]', username);
  // Press Enter
  await page.press('input[name="password"]', "Enter");
  await page.waitForSelector("[data-testid=dashboard-shell]");
  // Save signed-in state to '${username}StorageState.json'.
  await page.context().storageState({ path: `playwright/artifacts/${username}StorageState.json` });
}
