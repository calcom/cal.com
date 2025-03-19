import { expect } from "@playwright/test";
import { gotoWhenIdle } from "playwright/lib/testUtils";

import { test } from "./lib/fixtures";

// Set a consistent viewport size across all environments
test.use({
  viewport: { width: 1265, height: 1320 }, // Match the expected dimensions
});

test("Icons render properly", async ({ page }) => {
  await gotoWhenIdle(page, "/icons");
  await expect(page).toHaveScreenshot("icons.png", {
    maxDiffPixelRatio: 0.05,
    fullPage: true,
  });
});
