import { test, expect } from "@playwright/test";

// Using logged in state from globalSteup
test.use({ storageState: "playwright/artifacts/proStorageState.json" });

test("test menu settings", async ({ page }) => {
  // Try to go homepage
  await page.goto("/");
  // It should redirect you to the event-types page
  await page.waitForSelector("[data-testid=event-types]");
  await page.goto('/settings/profile');
  let pageTitle = await page.title();
  expect(pageTitle).toMatch('Profile');
});
