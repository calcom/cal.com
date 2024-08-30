import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test("Icons render properly", async ({ page }, testInfo) => {
  await page.goto("/icons");
  // To avoid different filenames between local and CI runs
  testInfo.snapshotSuffix = "";
  await expect(page).toHaveScreenshot("icons.png", {
    fullPage: true,
  });
});
