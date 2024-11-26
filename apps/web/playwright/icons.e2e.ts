import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test("Icons render properly", async ({ page }, testInfo) => {
  await page.goto("/icons");
  await expect(page).toHaveScreenshot("icons.png", {
    maxDiffPixels: 42000, // Allow some pixel differences (e.g., linux vs mac)
    fullPage: true,
  });
});
