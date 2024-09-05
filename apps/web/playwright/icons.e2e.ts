import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";

test("Icons render properly", async ({ page }, testInfo) => {
  await page.goto("/icons");
  await expect(page).toHaveScreenshot("icons.png", {
    fullPage: true,
  });
});
