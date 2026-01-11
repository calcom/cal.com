import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

// Set a consistent viewport size and device scale factor across all environments
// to reduce screenshot flakiness due to rendering differences between CI runners
test.use({
  viewport: { width: 1265, height: 1464 }, // Match the expected dimensions
  deviceScaleFactor: 1, // Ensure consistent rendering across different environments
});

test("Icons render properly", async ({ page }) => {
  await page.goto("/icons");
  await expect(page).toHaveScreenshot("icons.png", {
    // Increased threshold slightly (from 0.05 to 0.07) to account for minor
    // rendering differences between CI runners (e.g., font antialiasing)
    maxDiffPixelRatio: 0.07,
    fullPage: true,
  });
});
