import { test, expect } from '@playwright/test';

// Using logged in state from globalSteup
test.use({ storageState: "playwright/artifacts/proStorageState.json" });

test('change password', async ({ page }) => {

  // Try to go homepage
  await page.goto("/");
  // It should redirect you to the event-types page
  await page.waitForSelector("[data-testid=event-types]");

  // Go to http://localhost:3000/settings/security
  await page.goto('http://localhost:3000/settings/security');

  // Fill form
  await page.fill('[name="current_password"]', "pro");
  await page.fill('[name="new_password"]', "pro1");
  await page.press('[name="new_password"]', "Enter");

});
