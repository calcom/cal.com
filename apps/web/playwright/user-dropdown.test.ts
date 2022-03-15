import { expect, test } from "@playwright/test";

import "./custom-matchers";

// Using logged in state from globalSteup
test.use({ storageState: "playwright/artifacts/proStorageState.json" });

test.only("User Dropdown should open up on click", async ({ page }) => {
  // Try to go homepage
  await page.goto("/");

  await page.waitForSelector("[data-testid=user-dropdown-trigger]");

  await page.click("[data-testid=user-dropdown-trigger]");

  await expect(`[data-testid=user-dropdown-content]`).isInViewPort(page);
  await expect(page.locator(`[data-testid=user-dropdown-content]`)).toBeVisible();
});
